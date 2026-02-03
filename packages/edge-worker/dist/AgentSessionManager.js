import { EventEmitter } from "node:events";
import { AgentActivitySignal, AgentSessionStatus, AgentSessionType, } from "cyrus-core";
import { DEFAULT_VALIDATION_LOOP_CONFIG, parseValidationResult, renderValidationFixerPrompt, } from "./validation/index.js";
/**
 * Manages Agent Sessions integration with Claude Code SDK
 * Transforms Claude streaming messages into Agent Session format
 * Handles session lifecycle: create → active → complete/error
 *
 * CURRENTLY BEING HANDLED 'per repository'
 */
export class AgentSessionManager extends EventEmitter {
    issueTracker;
    sessions = new Map();
    entries = new Map(); // Stores a list of session entries per each session by its linearAgentActivitySessionId
    activeTasksBySession = new Map(); // Maps session ID to active Task tool use ID
    toolCallsByToolUseId = new Map(); // Track tool calls by their tool_use_id
    activeStatusActivitiesBySession = new Map(); // Maps session ID to active compacting status activity ID
    procedureAnalyzer;
    sharedApplicationServer;
    getParentSessionId;
    resumeParentSession;
    constructor(issueTracker, getParentSessionId, resumeParentSession, procedureAnalyzer, sharedApplicationServer) {
        super();
        this.issueTracker = issueTracker;
        this.getParentSessionId = getParentSessionId;
        this.resumeParentSession = resumeParentSession;
        this.procedureAnalyzer = procedureAnalyzer;
        this.sharedApplicationServer = sharedApplicationServer;
    }
    /**
     * Initialize a Linear agent session from webhook
     * The session is already created by Linear, we just need to track it
     */
    createLinearAgentSession(linearAgentActivitySessionId, issueId, issueMinimal, workspace) {
        console.log(`[AgentSessionManager] Tracking Linear session ${linearAgentActivitySessionId} for issue ${issueId}`);
        const agentSession = {
            linearAgentActivitySessionId,
            type: AgentSessionType.CommentThread,
            status: AgentSessionStatus.Active,
            context: AgentSessionType.CommentThread,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            issueId,
            issue: issueMinimal,
            workspace: workspace,
        };
        // Store locally
        this.sessions.set(linearAgentActivitySessionId, agentSession);
        this.entries.set(linearAgentActivitySessionId, []);
        return agentSession;
    }
    /**
     * Update Agent Session with session ID from system initialization
     * Automatically detects whether it's Claude or Gemini based on the runner
     */
    updateAgentSessionWithClaudeSessionId(linearAgentActivitySessionId, claudeSystemMessage) {
        const linearSession = this.sessions.get(linearAgentActivitySessionId);
        if (!linearSession) {
            console.warn(`[AgentSessionManager] No Linear session found for linearAgentActivitySessionId ${linearAgentActivitySessionId}`);
            return;
        }
        // Determine which runner is being used
        const runner = linearSession.agentRunner;
        const isGeminiRunner = runner?.constructor.name === "GeminiRunner";
        // Update the appropriate session ID based on runner type
        if (isGeminiRunner) {
            linearSession.geminiSessionId = claudeSystemMessage.session_id;
        }
        else {
            linearSession.claudeSessionId = claudeSystemMessage.session_id;
        }
        linearSession.updatedAt = Date.now();
        linearSession.metadata = {
            ...linearSession.metadata, // Preserve existing metadata
            model: claudeSystemMessage.model,
            tools: claudeSystemMessage.tools,
            permissionMode: claudeSystemMessage.permissionMode,
            apiKeySource: claudeSystemMessage.apiKeySource,
        };
    }
    /**
     * Create a session entry from user/assistant message (without syncing to Linear)
     */
    async createSessionEntry(linearAgentActivitySessionId, sdkMessage) {
        // Extract tool info if this is an assistant message
        const toolInfo = sdkMessage.type === "assistant" ? this.extractToolInfo(sdkMessage) : null;
        // Extract tool_use_id and error status if this is a user message with tool_result
        const toolResultInfo = sdkMessage.type === "user"
            ? this.extractToolResultInfo(sdkMessage)
            : null;
        // Extract SDK error from assistant messages (e.g., rate_limit, billing_error)
        // SDKAssistantMessage has optional `error?: SDKAssistantMessageError` field
        // See: @anthropic-ai/claude-agent-sdk sdk.d.ts lines 1013-1022
        // Evidence from ~/.cyrus/logs/CYGROW-348 session jsonl shows assistant messages with
        // "error":"rate_limit" field when usage limits are hit
        const sdkError = sdkMessage.type === "assistant" ? sdkMessage.error : undefined;
        // Determine which runner is being used
        const session = this.sessions.get(linearAgentActivitySessionId);
        const runner = session?.agentRunner;
        const isGeminiRunner = runner?.constructor.name === "GeminiRunner";
        const sessionEntry = {
            // Set the appropriate session ID based on runner type
            ...(isGeminiRunner
                ? { geminiSessionId: sdkMessage.session_id }
                : { claudeSessionId: sdkMessage.session_id }),
            type: sdkMessage.type,
            content: this.extractContent(sdkMessage),
            metadata: {
                timestamp: Date.now(),
                parentToolUseId: sdkMessage.parent_tool_use_id || undefined,
                ...(toolInfo && {
                    toolUseId: toolInfo.id,
                    toolName: toolInfo.name,
                    toolInput: toolInfo.input,
                }),
                ...(toolResultInfo && {
                    toolUseId: toolResultInfo.toolUseId,
                    toolResultError: toolResultInfo.isError,
                }),
                ...(sdkError && { sdkError }),
            },
        };
        // DON'T store locally yet - wait until we actually post to Linear
        return sessionEntry;
    }
    /**
     * Complete a session from Claude result message
     */
    async completeSession(linearAgentActivitySessionId, resultMessage) {
        const session = this.sessions.get(linearAgentActivitySessionId);
        if (!session) {
            console.error(`[AgentSessionManager] No session found for linearAgentActivitySessionId: ${linearAgentActivitySessionId}`);
            return;
        }
        // Clear any active Task when session completes
        this.activeTasksBySession.delete(linearAgentActivitySessionId);
        // Clear tool calls tracking for this session
        // Note: We should ideally track by session, but for now clearing all is safer
        // to prevent memory leaks
        const status = resultMessage.subtype === "success"
            ? AgentSessionStatus.Complete
            : AgentSessionStatus.Error;
        // Update session status and metadata
        await this.updateSessionStatus(linearAgentActivitySessionId, status, {
            totalCostUsd: resultMessage.total_cost_usd,
            usage: resultMessage.usage,
        });
        // Handle result using procedure routing system
        if ("result" in resultMessage && resultMessage.result) {
            await this.handleProcedureCompletion(session, linearAgentActivitySessionId, resultMessage);
        }
    }
    /**
     * Handle completion using procedure routing system
     */
    async handleProcedureCompletion(session, linearAgentActivitySessionId, resultMessage) {
        if (!this.procedureAnalyzer) {
            throw new Error("ProcedureAnalyzer not available");
        }
        // Check if error occurred
        if (resultMessage.subtype !== "success") {
            console.log(`[AgentSessionManager] Subroutine completed with error, not triggering next subroutine`);
            return;
        }
        // Get the session ID (either Claude or Gemini)
        const sessionId = session.claudeSessionId || session.geminiSessionId;
        if (!sessionId) {
            console.error(`[AgentSessionManager] No session ID found for procedure session`);
            return;
        }
        // Check if there's a next subroutine
        const nextSubroutine = this.procedureAnalyzer.getNextSubroutine(session);
        if (nextSubroutine) {
            // More subroutines to run - check if current subroutine requires approval
            const currentSubroutine = this.procedureAnalyzer.getCurrentSubroutine(session);
            if (currentSubroutine?.requiresApproval) {
                console.log(`[AgentSessionManager] Current subroutine "${currentSubroutine.name}" requires approval before proceeding`);
                // Check if SharedApplicationServer is available
                if (!this.sharedApplicationServer) {
                    console.error(`[AgentSessionManager] SharedApplicationServer not available for approval workflow`);
                    await this.createErrorActivity(linearAgentActivitySessionId, "Approval workflow failed: Server not available");
                    return;
                }
                // Extract the final result from the completed subroutine
                const subroutineResult = "result" in resultMessage && resultMessage.result
                    ? resultMessage.result
                    : "No result available";
                try {
                    // Register approval request with server
                    const approvalRequest = this.sharedApplicationServer.registerApprovalRequest(linearAgentActivitySessionId);
                    // Post approval elicitation to Linear with auth signal URL
                    const approvalMessage = `The previous step has completed. Please review the result below and approve to continue:\n\n${subroutineResult}`;
                    await this.createApprovalElicitation(linearAgentActivitySessionId, approvalMessage, approvalRequest.url);
                    console.log(`[AgentSessionManager] Waiting for approval at URL: ${approvalRequest.url}`);
                    // Wait for approval with timeout (30 minutes)
                    const approvalTimeout = 30 * 60 * 1000;
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Approval timeout")), approvalTimeout));
                    const { approved, feedback } = await Promise.race([
                        approvalRequest.promise,
                        timeoutPromise,
                    ]);
                    if (!approved) {
                        console.log(`[AgentSessionManager] Approval rejected for session ${linearAgentActivitySessionId}`);
                        await this.createErrorActivity(linearAgentActivitySessionId, `Workflow stopped: User rejected approval.${feedback ? `\n\nFeedback: ${feedback}` : ""}`);
                        return; // Stop workflow
                    }
                    console.log(`[AgentSessionManager] Approval granted, continuing to next subroutine`);
                    // Optionally post feedback as a thought
                    if (feedback) {
                        await this.createThoughtActivity(linearAgentActivitySessionId, `User feedback: ${feedback}`);
                    }
                    // Continue with advancement (fall through to existing code)
                }
                catch (error) {
                    const errorMessage = error.message;
                    if (errorMessage === "Approval timeout") {
                        console.log(`[AgentSessionManager] Approval timed out for session ${linearAgentActivitySessionId}`);
                        await this.createErrorActivity(linearAgentActivitySessionId, "Workflow stopped: Approval request timed out after 30 minutes.");
                    }
                    else {
                        console.error(`[AgentSessionManager] Approval request failed:`, error);
                        await this.createErrorActivity(linearAgentActivitySessionId, `Workflow stopped: Approval request failed - ${errorMessage}`);
                    }
                    return; // Stop workflow
                }
            }
            // Check if current subroutine uses validation loop
            if (currentSubroutine?.usesValidationLoop) {
                const handled = await this.handleValidationLoopCompletion(session, linearAgentActivitySessionId, resultMessage, sessionId, nextSubroutine);
                if (handled) {
                    return; // Validation loop took over control flow
                }
                // If not handled (validation passed or max retries), continue with normal advancement
            }
            // Advance procedure state
            console.log(`[AgentSessionManager] Subroutine completed, advancing to next: ${nextSubroutine.name}`);
            this.procedureAnalyzer.advanceToNextSubroutine(session, sessionId);
            // Emit event for EdgeWorker to handle subroutine transition
            // This replaces the callback pattern and allows EdgeWorker to subscribe
            this.emit("subroutineComplete", {
                linearAgentActivitySessionId,
                session,
            });
        }
        else {
            // Procedure complete - post final result
            console.log(`[AgentSessionManager] All subroutines completed, posting final result to Linear`);
            await this.addResultEntry(linearAgentActivitySessionId, resultMessage);
            // Handle child session completion
            const isChildSession = this.getParentSessionId?.(linearAgentActivitySessionId);
            if (isChildSession && this.resumeParentSession) {
                await this.handleChildSessionCompletion(linearAgentActivitySessionId, resultMessage);
            }
        }
    }
    /**
     * Handle validation loop completion for subroutines that use usesValidationLoop
     * Returns true if the validation loop took over control flow (needs fixer or retry)
     * Returns false if validation passed or max retries reached (continue with normal advancement)
     */
    async handleValidationLoopCompletion(session, linearAgentActivitySessionId, resultMessage, _sessionId, _nextSubroutine) {
        const maxIterations = DEFAULT_VALIDATION_LOOP_CONFIG.maxIterations;
        // Get or initialize validation loop state
        let validationLoop = session.metadata?.procedure?.validationLoop;
        if (!validationLoop) {
            validationLoop = {
                iteration: 0,
                inFixerMode: false,
                attempts: [],
            };
        }
        // Check if we're coming back from the fixer
        if (validationLoop.inFixerMode) {
            // Fixer completed, now we need to re-run verifications
            console.log(`[AgentSessionManager] Validation fixer completed for iteration ${validationLoop.iteration}, re-running verifications`);
            // Clear fixer mode flag
            validationLoop.inFixerMode = false;
            this.updateValidationLoopState(session, validationLoop);
            // Emit event to re-run verifications
            this.emit("validationLoopRerun", {
                linearAgentActivitySessionId,
                session,
                iteration: validationLoop.iteration,
            });
            return true;
        }
        // Parse the validation result from the response
        const resultText = "result" in resultMessage ? resultMessage.result : undefined;
        const structuredOutput = "structured_output" in resultMessage
            ? resultMessage.structured_output
            : undefined;
        const validationResult = parseValidationResult(resultText, structuredOutput);
        // Record this attempt
        const newIteration = validationLoop.iteration + 1;
        validationLoop.iteration = newIteration;
        validationLoop.attempts.push({
            iteration: newIteration,
            pass: validationResult.pass,
            reason: validationResult.reason,
            timestamp: Date.now(),
        });
        console.log(`[AgentSessionManager] Validation result for iteration ${newIteration}/${maxIterations}: pass=${validationResult.pass}, reason="${validationResult.reason.substring(0, 100)}..."`);
        // Update state in session
        this.updateValidationLoopState(session, validationLoop);
        // Check if validation passed
        if (validationResult.pass) {
            console.log(`[AgentSessionManager] Validation passed after ${newIteration} iteration(s)`);
            // Clear validation loop state for next subroutine
            this.clearValidationLoopState(session);
            return false; // Continue with normal advancement
        }
        // Check if we've exceeded max retries
        if (newIteration >= maxIterations) {
            console.log(`[AgentSessionManager] Validation failed after ${newIteration} iterations, continuing anyway`);
            // Post a thought about the failures
            await this.createThoughtActivity(linearAgentActivitySessionId, `Validation loop exhausted after ${newIteration} attempts. Last failure: ${validationResult.reason}`);
            // Clear validation loop state for next subroutine
            this.clearValidationLoopState(session);
            return false; // Continue with normal advancement
        }
        // Validation failed and we have retries left - run the fixer
        console.log(`[AgentSessionManager] Validation failed, running fixer (iteration ${newIteration}/${maxIterations})`);
        // Set fixer mode flag
        validationLoop.inFixerMode = true;
        this.updateValidationLoopState(session, validationLoop);
        // Render the fixer prompt with context
        const previousAttempts = validationLoop.attempts.slice(0, -1).map((a) => ({
            iteration: a.iteration,
            reason: a.reason,
        }));
        const fixerPrompt = renderValidationFixerPrompt({
            failureReason: validationResult.reason,
            iteration: newIteration,
            maxIterations,
            previousAttempts,
        });
        // Emit event for EdgeWorker to run the fixer
        this.emit("validationLoopIteration", {
            linearAgentActivitySessionId,
            session,
            fixerPrompt,
            iteration: newIteration,
            maxIterations,
        });
        return true; // Validation loop took over control flow
    }
    /**
     * Update validation loop state in session metadata
     */
    updateValidationLoopState(session, validationLoop) {
        if (!session.metadata) {
            session.metadata = {};
        }
        if (!session.metadata.procedure) {
            return; // No procedure metadata, can't update
        }
        session.metadata.procedure.validationLoop = validationLoop;
    }
    /**
     * Clear validation loop state from session metadata
     */
    clearValidationLoopState(session) {
        if (session.metadata?.procedure) {
            delete session.metadata.procedure.validationLoop;
        }
    }
    /**
     * Handle child session completion and resume parent
     */
    async handleChildSessionCompletion(linearAgentActivitySessionId, resultMessage) {
        if (!this.getParentSessionId || !this.resumeParentSession) {
            return;
        }
        const parentAgentSessionId = this.getParentSessionId(linearAgentActivitySessionId);
        if (!parentAgentSessionId) {
            console.error(`[AgentSessionManager] No parent session ID found for child ${linearAgentActivitySessionId}`);
            return;
        }
        console.log(`[AgentSessionManager] Child session ${linearAgentActivitySessionId} completed, resuming parent ${parentAgentSessionId}`);
        try {
            const childResult = "result" in resultMessage
                ? resultMessage.result
                : "No result available";
            const promptToParent = `Child agent session ${linearAgentActivitySessionId} completed with result:\n\n${childResult}`;
            await this.resumeParentSession(parentAgentSessionId, promptToParent, linearAgentActivitySessionId);
            console.log(`[AgentSessionManager] Successfully resumed parent session ${parentAgentSessionId}`);
        }
        catch (error) {
            console.error(`[AgentSessionManager] Failed to resume parent session:`, error);
        }
    }
    /**
     * Handle streaming Claude messages and route to appropriate methods
     */
    async handleClaudeMessage(linearAgentActivitySessionId, message) {
        try {
            switch (message.type) {
                case "system":
                    if (message.subtype === "init") {
                        this.updateAgentSessionWithClaudeSessionId(linearAgentActivitySessionId, message);
                        // Post model notification
                        const systemMessage = message;
                        if (systemMessage.model) {
                            await this.postModelNotificationThought(linearAgentActivitySessionId, systemMessage.model);
                        }
                    }
                    else if (message.subtype === "status") {
                        // Handle status updates (compacting, etc.)
                        await this.handleStatusMessage(linearAgentActivitySessionId, message);
                    }
                    break;
                case "user": {
                    const userEntry = await this.createSessionEntry(linearAgentActivitySessionId, message);
                    await this.syncEntryToLinear(userEntry, linearAgentActivitySessionId);
                    break;
                }
                case "assistant": {
                    const assistantEntry = await this.createSessionEntry(linearAgentActivitySessionId, message);
                    await this.syncEntryToLinear(assistantEntry, linearAgentActivitySessionId);
                    break;
                }
                case "result":
                    await this.completeSession(linearAgentActivitySessionId, message);
                    break;
                default:
                    console.warn(`[AgentSessionManager] Unknown message type: ${message.type}`);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error handling message:`, error);
            // Mark session as error state
            await this.updateSessionStatus(linearAgentActivitySessionId, AgentSessionStatus.Error);
        }
    }
    /**
     * Update session status and metadata
     */
    async updateSessionStatus(linearAgentActivitySessionId, status, additionalMetadata) {
        const session = this.sessions.get(linearAgentActivitySessionId);
        if (!session)
            return;
        session.status = status;
        session.updatedAt = Date.now();
        // Clear wasRunning flag when session reaches terminal state (for crash recovery tracking)
        if (status === AgentSessionStatus.Complete ||
            status === AgentSessionStatus.Error) {
            session.wasRunning = false;
        }
        if (additionalMetadata) {
            session.metadata = { ...session.metadata, ...additionalMetadata };
        }
        this.sessions.set(linearAgentActivitySessionId, session);
    }
    /**
     * Add result entry from result message
     */
    async addResultEntry(linearAgentActivitySessionId, resultMessage) {
        // Determine which runner is being used
        const session = this.sessions.get(linearAgentActivitySessionId);
        const runner = session?.agentRunner;
        const isGeminiRunner = runner?.constructor.name === "GeminiRunner";
        const resultEntry = {
            // Set the appropriate session ID based on runner type
            ...(isGeminiRunner
                ? { geminiSessionId: resultMessage.session_id }
                : { claudeSessionId: resultMessage.session_id }),
            type: "result",
            content: "result" in resultMessage ? resultMessage.result : "",
            metadata: {
                timestamp: Date.now(),
                durationMs: resultMessage.duration_ms,
                isError: resultMessage.is_error,
            },
        };
        // DON'T store locally - syncEntryToLinear will do it
        // Sync to Linear
        await this.syncEntryToLinear(resultEntry, linearAgentActivitySessionId);
    }
    /**
     * Extract content from Claude message
     */
    extractContent(sdkMessage) {
        const message = sdkMessage.type === "user"
            ? sdkMessage.message
            : sdkMessage.message;
        if (typeof message.content === "string") {
            return message.content;
        }
        if (Array.isArray(message.content)) {
            return message.content
                .map((block) => {
                if (block.type === "text") {
                    return block.text;
                }
                else if (block.type === "tool_use") {
                    // For tool use blocks, return the input as JSON string
                    return JSON.stringify(block.input, null, 2);
                }
                else if (block.type === "tool_result") {
                    // For tool_result blocks, extract just the text content
                    // Also store the error status in metadata if needed
                    if ("is_error" in block && block.is_error) {
                        // Mark this as an error result - we'll handle this elsewhere
                    }
                    if (typeof block.content === "string") {
                        return block.content;
                    }
                    if (Array.isArray(block.content)) {
                        return block.content
                            .filter((contentBlock) => contentBlock.type === "text")
                            .map((contentBlock) => contentBlock.text)
                            .join("\n");
                    }
                    return "";
                }
                return "";
            })
                .filter(Boolean)
                .join("\n");
        }
        return "";
    }
    /**
     * Extract tool information from Claude assistant message
     */
    extractToolInfo(sdkMessage) {
        const message = sdkMessage.message;
        if (Array.isArray(message.content)) {
            const toolUse = message.content.find((block) => block.type === "tool_use");
            if (toolUse &&
                "id" in toolUse &&
                "name" in toolUse &&
                "input" in toolUse) {
                return {
                    id: toolUse.id,
                    name: toolUse.name,
                    input: toolUse.input,
                };
            }
        }
        return null;
    }
    /**
     * Extract tool_use_id and error status from Claude user message containing tool_result
     */
    extractToolResultInfo(sdkMessage) {
        const message = sdkMessage.message;
        if (Array.isArray(message.content)) {
            const toolResult = message.content.find((block) => block.type === "tool_result");
            if (toolResult && "tool_use_id" in toolResult) {
                return {
                    toolUseId: toolResult.tool_use_id,
                    isError: "is_error" in toolResult && toolResult.is_error === true,
                };
            }
        }
        return null;
    }
    /**
     * Extract tool result content and error status from session entry
     */
    extractToolResult(entry) {
        // Check if we have the error status in metadata
        const isError = entry.metadata?.toolResultError || false;
        return {
            content: entry.content,
            isError: isError,
        };
    }
    /**
     * Sync Agent Session Entry to Linear (create AgentActivity)
     */
    async syncEntryToLinear(entry, linearAgentActivitySessionId) {
        try {
            const session = this.sessions.get(linearAgentActivitySessionId);
            if (!session) {
                console.warn(`[AgentSessionManager] No Linear session for linearAgentActivitySessionId ${linearAgentActivitySessionId}`);
                return;
            }
            // Store entry locally first
            const entries = this.entries.get(linearAgentActivitySessionId) || [];
            entries.push(entry);
            this.entries.set(linearAgentActivitySessionId, entries);
            // Build activity content based on entry type
            let content;
            let ephemeral = false;
            switch (entry.type) {
                case "user": {
                    const activeTaskId = this.activeTasksBySession.get(linearAgentActivitySessionId);
                    if (activeTaskId && activeTaskId === entry.metadata?.toolUseId) {
                        content = {
                            type: "thought",
                            body: `✅ Task Completed\n\n\n\n${entry.content}\n\n---\n\n`,
                        };
                        this.activeTasksBySession.delete(linearAgentActivitySessionId);
                    }
                    else if (entry.metadata?.toolUseId) {
                        // This is a tool result - create an action activity with the result
                        const toolResult = this.extractToolResult(entry);
                        if (toolResult) {
                            // Get the original tool information
                            const originalTool = this.toolCallsByToolUseId.get(entry.metadata.toolUseId);
                            const toolName = originalTool?.name || "Tool";
                            const toolInput = originalTool?.input || "";
                            // Clean up the tool call from our tracking map
                            if (entry.metadata.toolUseId) {
                                this.toolCallsByToolUseId.delete(entry.metadata.toolUseId);
                            }
                            // Skip creating activity for TodoWrite/write_todos results since they already created a non-ephemeral thought
                            // Skip AskUserQuestion results since it's custom handled via Linear's select signal elicitation
                            if (toolName === "TodoWrite" ||
                                toolName === "↪ TodoWrite" ||
                                toolName === "write_todos" ||
                                toolName === "AskUserQuestion" ||
                                toolName === "↪ AskUserQuestion") {
                                return;
                            }
                            // Get formatter from runner
                            const formatter = session.agentRunner?.getFormatter();
                            if (!formatter) {
                                console.warn(`[AgentSessionManager] No formatter available for session ${linearAgentActivitySessionId}`);
                                return;
                            }
                            // Format parameter and result using runner's formatter
                            const formattedParameter = formatter.formatToolParameter(toolName, toolInput);
                            const formattedResult = formatter.formatToolResult(toolName, toolInput, toolResult.content?.trim() || "", toolResult.isError);
                            // Format the action name (with description for Bash tool)
                            const formattedAction = formatter.formatToolActionName(toolName, toolInput, toolResult.isError);
                            content = {
                                type: "action",
                                action: formattedAction,
                                parameter: formattedParameter,
                                result: formattedResult,
                            };
                        }
                        else {
                            return;
                        }
                    }
                    else {
                        return;
                    }
                    break;
                }
                case "assistant": {
                    // Assistant messages can be thoughts or responses
                    if (entry.metadata?.toolUseId) {
                        const toolName = entry.metadata.toolName || "Tool";
                        // Store tool information for later use in tool results
                        if (entry.metadata.toolUseId) {
                            // Check if this is a subtask with arrow prefix
                            let storedName = toolName;
                            if (entry.metadata?.parentToolUseId) {
                                const activeTaskId = this.activeTasksBySession.get(linearAgentActivitySessionId);
                                if (activeTaskId === entry.metadata?.parentToolUseId) {
                                    storedName = `↪ ${toolName}`;
                                }
                            }
                            this.toolCallsByToolUseId.set(entry.metadata.toolUseId, {
                                name: storedName,
                                input: entry.metadata.toolInput || entry.content,
                            });
                        }
                        // Skip AskUserQuestion tool - it's custom handled via Linear's select signal elicitation
                        if (toolName === "AskUserQuestion") {
                            return;
                        }
                        // Special handling for TodoWrite tool (Claude) and write_todos (Gemini) - treat as thought instead of action
                        if (toolName === "TodoWrite" || toolName === "write_todos") {
                            // Get formatter from runner
                            const formatter = session.agentRunner?.getFormatter();
                            if (!formatter) {
                                console.warn(`[AgentSessionManager] No formatter available for session ${linearAgentActivitySessionId}`);
                                return;
                            }
                            const formattedTodos = formatter.formatTodoWriteParameter(entry.content);
                            content = {
                                type: "thought",
                                body: formattedTodos,
                            };
                            // TodoWrite/write_todos is not ephemeral
                            ephemeral = false;
                        }
                        else if (toolName === "Task") {
                            // Get formatter from runner
                            const formatter = session.agentRunner?.getFormatter();
                            if (!formatter) {
                                console.warn(`[AgentSessionManager] No formatter available for session ${linearAgentActivitySessionId}`);
                                return;
                            }
                            // Special handling for Task tool - add start marker and track active task
                            const toolInput = entry.metadata.toolInput || entry.content;
                            const formattedParameter = formatter.formatToolParameter(toolName, toolInput);
                            const displayName = toolName;
                            // Track this as the active Task for this session
                            if (entry.metadata?.toolUseId) {
                                this.activeTasksBySession.set(linearAgentActivitySessionId, entry.metadata.toolUseId);
                            }
                            content = {
                                type: "action",
                                action: displayName,
                                parameter: formattedParameter,
                                // result will be added later when we get tool result
                            };
                            // Task is not ephemeral
                            ephemeral = false;
                        }
                        else {
                            // Get formatter from runner
                            const formatter = session.agentRunner?.getFormatter();
                            if (!formatter) {
                                console.warn(`[AgentSessionManager] No formatter available for session ${linearAgentActivitySessionId}`);
                                return;
                            }
                            // Other tools - check if they're within an active Task
                            const toolInput = entry.metadata.toolInput || entry.content;
                            let displayName = toolName;
                            if (entry.metadata?.parentToolUseId) {
                                const activeTaskId = this.activeTasksBySession.get(linearAgentActivitySessionId);
                                if (activeTaskId === entry.metadata?.parentToolUseId) {
                                    displayName = `↪ ${toolName}`;
                                }
                            }
                            const formattedParameter = formatter.formatToolParameter(displayName, toolInput);
                            content = {
                                type: "action",
                                action: displayName,
                                parameter: formattedParameter,
                                // result will be added later when we get tool result
                            };
                            // Standard tool calls are ephemeral
                            ephemeral = true;
                        }
                    }
                    else if (entry.metadata?.sdkError) {
                        // Assistant message with SDK error (e.g., rate_limit, billing_error)
                        // Create an error type so it's visible to users (not just a thought)
                        // Per CYPACK-719: usage limits should trigger "error" type activity
                        content = {
                            type: "error",
                            body: entry.content,
                        };
                    }
                    else {
                        // Regular assistant message - create a thought
                        content = {
                            type: "thought",
                            body: entry.content,
                        };
                    }
                    break;
                }
                case "system":
                    // System messages are thoughts
                    content = {
                        type: "thought",
                        body: entry.content,
                    };
                    break;
                case "result":
                    // Result messages can be responses or errors
                    if (entry.metadata?.isError) {
                        content = {
                            type: "error",
                            body: entry.content,
                        };
                    }
                    else {
                        content = {
                            type: "response",
                            body: entry.content,
                        };
                    }
                    break;
                default:
                    // Default to thought
                    content = {
                        type: "thought",
                        body: entry.content,
                    };
            }
            // Check if current subroutine has suppressThoughtPosting enabled
            // If so, suppress thoughts and actions (but still post responses and results)
            const currentSubroutine = this.procedureAnalyzer?.getCurrentSubroutine(session);
            if (currentSubroutine?.suppressThoughtPosting) {
                // Only suppress thoughts and actions, not responses or results
                if (content.type === "thought" || content.type === "action") {
                    console.log(`[AgentSessionManager] Suppressing ${content.type} posting for subroutine "${currentSubroutine.name}"`);
                    return; // Don't post to Linear
                }
            }
            const activityInput = {
                agentSessionId: session.linearAgentActivitySessionId, // Use the Linear session ID
                content,
                ...(ephemeral && { ephemeral: true }),
            };
            const result = await this.issueTracker.createAgentActivity(activityInput);
            if (result.success && result.agentActivity) {
                const agentActivity = await result.agentActivity;
                entry.linearAgentActivityId = agentActivity.id;
                console.log(`[AgentSessionManager] Created ${content.type} activity ${entry.linearAgentActivityId}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to create Linear activity:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Failed to sync entry to Linear:`, error);
        }
    }
    /**
     * Get session by ID
     */
    getSession(linearAgentActivitySessionId) {
        return this.sessions.get(linearAgentActivitySessionId);
    }
    /**
     * Get session entries by session ID
     */
    getSessionEntries(linearAgentActivitySessionId) {
        return this.entries.get(linearAgentActivitySessionId) || [];
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter((session) => session.status === AgentSessionStatus.Active);
    }
    /**
     * Add or update agent runner for a session
     */
    addAgentRunner(linearAgentActivitySessionId, agentRunner) {
        const session = this.sessions.get(linearAgentActivitySessionId);
        if (!session) {
            console.warn(`[AgentSessionManager] No session found for linearAgentActivitySessionId ${linearAgentActivitySessionId}`);
            return;
        }
        session.agentRunner = agentRunner;
        session.wasRunning = true; // Track for crash recovery
        session.updatedAt = Date.now();
        console.log(`[AgentSessionManager] Added agent runner to session ${linearAgentActivitySessionId}`);
    }
    /**
     *  Get all agent runners
     */
    getAllAgentRunners() {
        return Array.from(this.sessions.values())
            .map((session) => session.agentRunner)
            .filter((runner) => runner !== undefined);
    }
    /**
     * Get all agent runners for a specific issue
     */
    getAgentRunnersForIssue(issueId) {
        return Array.from(this.sessions.values())
            .filter((session) => session.issueId === issueId)
            .map((session) => session.agentRunner)
            .filter((runner) => runner !== undefined);
    }
    /**
     * Get sessions by issue ID
     */
    getSessionsByIssueId(issueId) {
        return Array.from(this.sessions.values()).filter((session) => session.issueId === issueId);
    }
    /**
     * Get active sessions by issue ID
     */
    getActiveSessionsByIssueId(issueId) {
        return Array.from(this.sessions.values()).filter((session) => session.issueId === issueId &&
            session.status === AgentSessionStatus.Active);
    }
    /**
     * Get all sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Get sessions that were interrupted (wasRunning === true but no active runner)
     * Used for crash recovery on startup
     */
    getInterruptedSessions() {
        return Array.from(this.sessions.values()).filter((session) => session.wasRunning === true &&
            !session.agentRunner?.isRunning() &&
            session.status === AgentSessionStatus.Active);
    }
    /**
     * Get agent runner for a specific session
     */
    getAgentRunner(linearAgentActivitySessionId) {
        const session = this.sessions.get(linearAgentActivitySessionId);
        return session?.agentRunner;
    }
    /**
     * Check if an agent runner exists for a session
     */
    hasAgentRunner(linearAgentActivitySessionId) {
        const session = this.sessions.get(linearAgentActivitySessionId);
        return session?.agentRunner !== undefined;
    }
    /**
     * Create a thought activity
     */
    async createThoughtActivity(sessionId, body) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.linearAgentActivitySessionId) {
            console.warn(`[AgentSessionManager] No Linear session ID for session ${sessionId}`);
            return;
        }
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: session.linearAgentActivitySessionId,
                content: {
                    type: "thought",
                    body,
                },
            });
            if (result.success) {
                console.log(`[AgentSessionManager] Created thought activity for session ${sessionId}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to create thought activity:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error creating thought activity:`, error);
        }
    }
    /**
     * Create an action activity
     */
    async createActionActivity(sessionId, action, parameter, result) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.linearAgentActivitySessionId) {
            console.warn(`[AgentSessionManager] No Linear session ID for session ${sessionId}`);
            return;
        }
        try {
            const content = {
                type: "action",
                action,
                parameter,
            };
            if (result !== undefined) {
                content.result = result;
            }
            const response = await this.issueTracker.createAgentActivity({
                agentSessionId: session.linearAgentActivitySessionId,
                content,
            });
            if (response.success) {
                console.log(`[AgentSessionManager] Created action activity for session ${sessionId}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to create action activity:`, response);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error creating action activity:`, error);
        }
    }
    /**
     * Create a response activity
     */
    async createResponseActivity(sessionId, body) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.linearAgentActivitySessionId) {
            console.warn(`[AgentSessionManager] No Linear session ID for session ${sessionId}`);
            return;
        }
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: session.linearAgentActivitySessionId,
                content: {
                    type: "response",
                    body,
                },
            });
            if (result.success) {
                console.log(`[AgentSessionManager] Created response activity for session ${sessionId}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to create response activity:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error creating response activity:`, error);
        }
    }
    /**
     * Create an error activity
     */
    async createErrorActivity(sessionId, body) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.linearAgentActivitySessionId) {
            console.warn(`[AgentSessionManager] No Linear session ID for session ${sessionId}`);
            return;
        }
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: session.linearAgentActivitySessionId,
                content: {
                    type: "error",
                    body,
                },
            });
            if (result.success) {
                console.log(`[AgentSessionManager] Created error activity for session ${sessionId}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to create error activity:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error creating error activity:`, error);
        }
    }
    /**
     * Create an elicitation activity
     */
    async createElicitationActivity(sessionId, body) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.linearAgentActivitySessionId) {
            console.warn(`[AgentSessionManager] No Linear session ID for session ${sessionId}`);
            return;
        }
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: session.linearAgentActivitySessionId,
                content: {
                    type: "elicitation",
                    body,
                },
            });
            if (result.success) {
                console.log(`[AgentSessionManager] Created elicitation activity for session ${sessionId}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to create elicitation activity:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error creating elicitation activity:`, error);
        }
    }
    /**
     * Create an approval elicitation activity with auth signal
     */
    async createApprovalElicitation(sessionId, body, approvalUrl) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.linearAgentActivitySessionId) {
            console.warn(`[AgentSessionManager] No Linear session ID for session ${sessionId}`);
            return;
        }
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: session.linearAgentActivitySessionId,
                content: {
                    type: "elicitation",
                    body,
                },
                signal: AgentActivitySignal.Auth,
                signalMetadata: {
                    url: approvalUrl,
                },
            });
            if (result.success) {
                console.log(`[AgentSessionManager] Created approval elicitation for session ${sessionId} with URL: ${approvalUrl}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to create approval elicitation:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error creating approval elicitation:`, error);
        }
    }
    /**
     * Clear completed sessions older than specified time
     */
    cleanup(olderThanMs = 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - olderThanMs;
        for (const [sessionId, session] of this.sessions.entries()) {
            if ((session.status === "complete" || session.status === "error") &&
                session.updatedAt < cutoff) {
                this.sessions.delete(sessionId);
                this.entries.delete(sessionId);
                console.log(`[AgentSessionManager] Cleaned up session ${sessionId}`);
            }
        }
    }
    /**
     * Serialize Agent Session state for persistence
     */
    serializeState() {
        const sessions = {};
        const entries = {};
        // Serialize sessions
        for (const [sessionId, session] of this.sessions.entries()) {
            // Exclude agentRunner from serialization as it's not serializable
            const { agentRunner: _agentRunner, ...serializableSession } = session;
            sessions[sessionId] = serializableSession;
        }
        // Serialize entries
        for (const [sessionId, sessionEntries] of this.entries.entries()) {
            entries[sessionId] = sessionEntries.map((entry) => ({
                ...entry,
            }));
        }
        return { sessions, entries };
    }
    /**
     * Restore Agent Session state from serialized data
     */
    restoreState(serializedSessions, serializedEntries) {
        // Clear existing state
        this.sessions.clear();
        this.entries.clear();
        // Restore sessions
        for (const [sessionId, sessionData] of Object.entries(serializedSessions)) {
            const session = {
                ...sessionData,
            };
            this.sessions.set(sessionId, session);
        }
        // Restore entries
        for (const [sessionId, entriesData] of Object.entries(serializedEntries)) {
            const sessionEntries = entriesData.map((entryData) => ({
                ...entryData,
            }));
            this.entries.set(sessionId, sessionEntries);
        }
        console.log(`[AgentSessionManager] Restored ${this.sessions.size} sessions, ${Object.keys(serializedEntries).length} entry collections`);
    }
    /**
     * Build a conversation summary from stored entries for session recovery.
     * Used when a session resume fails and we need to reconstruct context.
     *
     * @param linearAgentActivitySessionId The session ID to build summary for
     * @returns Summary string or undefined if no entries exist
     */
    buildConversationSummary(linearAgentActivitySessionId) {
        const entries = this.entries.get(linearAgentActivitySessionId);
        if (!entries || entries.length === 0) {
            return undefined;
        }
        const summaryLines = [
            "Previous context (session was interrupted):",
        ];
        // Keep track of total characters to stay under ~2000 chars (~500 tokens)
        const maxSummaryChars = 2000;
        let currentChars = summaryLines[0].length;
        for (const entry of entries) {
            let line;
            if (entry.type === "user" && !entry.metadata?.toolUseId) {
                // Include user messages (not tool results), truncated if long
                const content = entry.content.length > 200
                    ? entry.content.slice(0, 200) + "..."
                    : entry.content;
                line = `- User: "${content}"`;
            }
            else if (entry.type === "assistant" &&
                entry.metadata?.toolName &&
                entry.metadata.toolName !== "TodoWrite" // Skip noisy TodoWrite
            ) {
                // Summarize tool usage
                line = `- You used: ${entry.metadata.toolName}`;
            }
            if (line) {
                // Check if adding this line would exceed limit
                if (currentChars + line.length + 1 > maxSummaryChars) {
                    summaryLines.push("- ... (earlier context truncated)");
                    break;
                }
                summaryLines.push(line);
                currentChars += line.length + 1;
            }
        }
        // Only return summary if we have meaningful content beyond the header
        if (summaryLines.length <= 1) {
            return undefined;
        }
        const summary = summaryLines.join("\n");
        console.log(`[AgentSessionManager] Built conversation summary for ${linearAgentActivitySessionId}: ${summaryLines.length - 1} entries, ${summary.length} chars`);
        return summary;
    }
    /**
     * Clear the Claude session ID from a session to allow recovery from stale state.
     * Used when a session resume fails because the session no longer exists.
     *
     * @param linearAgentActivitySessionId The session ID to clear
     */
    clearClaudeSessionId(linearAgentActivitySessionId) {
        const session = this.sessions.get(linearAgentActivitySessionId);
        if (session) {
            const oldSessionId = session.claudeSessionId;
            session.claudeSessionId = undefined;
            session.updatedAt = Date.now();
            console.log(`[AgentSessionManager] Cleared stale Claude session ID for ${linearAgentActivitySessionId} (was: ${oldSessionId})`);
        }
    }
    /**
     * Post a thought about the model being used
     */
    async postModelNotificationThought(linearAgentActivitySessionId, model) {
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: linearAgentActivitySessionId,
                content: {
                    type: "thought",
                    body: `Using model: ${model}`,
                },
            });
            if (result.success) {
                console.log(`[AgentSessionManager] Posted model notification for session ${linearAgentActivitySessionId} (model: ${model})`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to post model notification:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error posting model notification:`, error);
        }
    }
    /**
     * Post an ephemeral "Analyzing your request..." thought and return the activity ID
     */
    async postAnalyzingThought(linearAgentActivitySessionId) {
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: linearAgentActivitySessionId,
                content: {
                    type: "thought",
                    body: "Analyzing your request…",
                },
                ephemeral: true,
            });
            if (result.success && result.agentActivity) {
                const activity = await result.agentActivity;
                console.log(`[AgentSessionManager] Posted analyzing thought for session ${linearAgentActivitySessionId}`);
                return activity.id;
            }
            else {
                console.error(`[AgentSessionManager] Failed to post analyzing thought:`, result);
                return null;
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error posting analyzing thought:`, error);
            return null;
        }
    }
    /**
     * Post the procedure selection result as a non-ephemeral thought
     */
    async postProcedureSelectionThought(linearAgentActivitySessionId, procedureName, classification) {
        try {
            const result = await this.issueTracker.createAgentActivity({
                agentSessionId: linearAgentActivitySessionId,
                content: {
                    type: "thought",
                    body: `Selected procedure: **${procedureName}** (classified as: ${classification})`,
                },
                ephemeral: false,
            });
            if (result.success) {
                console.log(`[AgentSessionManager] Posted procedure selection for session ${linearAgentActivitySessionId}: ${procedureName}`);
            }
            else {
                console.error(`[AgentSessionManager] Failed to post procedure selection:`, result);
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error posting procedure selection:`, error);
        }
    }
    /**
     * Handle status messages (compacting, etc.)
     */
    async handleStatusMessage(linearAgentActivitySessionId, message) {
        const session = this.sessions.get(linearAgentActivitySessionId);
        if (!session || !session.linearAgentActivitySessionId) {
            console.warn(`[AgentSessionManager] No Linear session ID for session ${linearAgentActivitySessionId}`);
            return;
        }
        try {
            if (message.status === "compacting") {
                // Create an ephemeral thought for the compacting status
                const result = await this.issueTracker.createAgentActivity({
                    agentSessionId: session.linearAgentActivitySessionId,
                    content: {
                        type: "thought",
                        body: "Compacting conversation history…",
                    },
                    ephemeral: true,
                });
                if (result.success && result.agentActivity) {
                    const activity = await result.agentActivity;
                    // Store the activity ID so we can replace it later
                    this.activeStatusActivitiesBySession.set(linearAgentActivitySessionId, activity.id);
                    console.log(`[AgentSessionManager] Posted ephemeral compacting status for session ${linearAgentActivitySessionId}`);
                }
                else {
                    console.error(`[AgentSessionManager] Failed to post compacting status:`, result);
                }
            }
            else if (message.status === null) {
                // Clear the status - post a non-ephemeral thought to replace the ephemeral one
                const result = await this.issueTracker.createAgentActivity({
                    agentSessionId: session.linearAgentActivitySessionId,
                    content: {
                        type: "thought",
                        body: "Conversation history compacted",
                    },
                    ephemeral: false,
                });
                if (result.success) {
                    // Clean up the stored activity ID
                    this.activeStatusActivitiesBySession.delete(linearAgentActivitySessionId);
                    console.log(`[AgentSessionManager] Posted non-ephemeral status clear for session ${linearAgentActivitySessionId}`);
                }
                else {
                    console.error(`[AgentSessionManager] Failed to post status clear:`, result);
                }
            }
        }
        catch (error) {
            console.error(`[AgentSessionManager] Error handling status message:`, error);
        }
    }
}
//# sourceMappingURL=AgentSessionManager.js.map