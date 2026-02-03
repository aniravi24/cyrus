import { EventEmitter } from "node:events";
import type { SDKMessage, SDKResultMessage, SDKSystemMessage } from "cyrus-claude-runner";
import { type CyrusAgentSession, type CyrusAgentSessionEntry, type IAgentRunner, type IIssueTrackerService, type IssueMinimal, type SerializedCyrusAgentSession, type SerializedCyrusAgentSessionEntry, type Workspace } from "cyrus-core";
import type { ProcedureAnalyzer } from "./procedures/ProcedureAnalyzer.js";
import type { SharedApplicationServer } from "./SharedApplicationServer.js";
/**
 * Events emitted by AgentSessionManager
 */
export interface AgentSessionManagerEvents {
    subroutineComplete: (data: {
        linearAgentActivitySessionId: string;
        session: CyrusAgentSession;
    }) => void;
    /**
     * Emitted when validation fails and we need to run the validation-fixer
     * The EdgeWorker should respond by running the fixer prompt and then re-running verifications
     */
    validationLoopIteration: (data: {
        linearAgentActivitySessionId: string;
        session: CyrusAgentSession;
        /** The fixer prompt to run (already rendered with failure context) */
        fixerPrompt: string;
        /** Current iteration (1-based) */
        iteration: number;
        /** Maximum iterations allowed */
        maxIterations: number;
    }) => void;
    /**
     * Emitted when we need to re-run the verifications subroutine
     */
    validationLoopRerun: (data: {
        linearAgentActivitySessionId: string;
        session: CyrusAgentSession;
        /** Current iteration (1-based) */
        iteration: number;
    }) => void;
}
/**
 * Type-safe event emitter interface for AgentSessionManager
 */
export declare interface AgentSessionManager {
    on<K extends keyof AgentSessionManagerEvents>(event: K, listener: AgentSessionManagerEvents[K]): this;
    emit<K extends keyof AgentSessionManagerEvents>(event: K, ...args: Parameters<AgentSessionManagerEvents[K]>): boolean;
}
/**
 * Manages Agent Sessions integration with Claude Code SDK
 * Transforms Claude streaming messages into Agent Session format
 * Handles session lifecycle: create → active → complete/error
 *
 * CURRENTLY BEING HANDLED 'per repository'
 */
export declare class AgentSessionManager extends EventEmitter {
    private issueTracker;
    private sessions;
    private entries;
    private activeTasksBySession;
    private toolCallsByToolUseId;
    private activeStatusActivitiesBySession;
    private procedureAnalyzer?;
    private sharedApplicationServer?;
    private getParentSessionId?;
    private resumeParentSession?;
    constructor(issueTracker: IIssueTrackerService, getParentSessionId?: (childSessionId: string) => string | undefined, resumeParentSession?: (parentSessionId: string, prompt: string, childSessionId: string) => Promise<void>, procedureAnalyzer?: ProcedureAnalyzer, sharedApplicationServer?: SharedApplicationServer);
    /**
     * Initialize a Linear agent session from webhook
     * The session is already created by Linear, we just need to track it
     */
    createLinearAgentSession(linearAgentActivitySessionId: string, issueId: string, issueMinimal: IssueMinimal, workspace: Workspace): CyrusAgentSession;
    /**
     * Update Agent Session with session ID from system initialization
     * Automatically detects whether it's Claude or Gemini based on the runner
     */
    updateAgentSessionWithClaudeSessionId(linearAgentActivitySessionId: string, claudeSystemMessage: SDKSystemMessage): void;
    /**
     * Create a session entry from user/assistant message (without syncing to Linear)
     */
    private createSessionEntry;
    /**
     * Complete a session from Claude result message
     */
    completeSession(linearAgentActivitySessionId: string, resultMessage: SDKResultMessage): Promise<void>;
    /**
     * Handle completion using procedure routing system
     */
    private handleProcedureCompletion;
    /**
     * Handle validation loop completion for subroutines that use usesValidationLoop
     * Returns true if the validation loop took over control flow (needs fixer or retry)
     * Returns false if validation passed or max retries reached (continue with normal advancement)
     */
    private handleValidationLoopCompletion;
    /**
     * Update validation loop state in session metadata
     */
    private updateValidationLoopState;
    /**
     * Clear validation loop state from session metadata
     */
    private clearValidationLoopState;
    /**
     * Handle child session completion and resume parent
     */
    private handleChildSessionCompletion;
    /**
     * Handle streaming Claude messages and route to appropriate methods
     */
    handleClaudeMessage(linearAgentActivitySessionId: string, message: SDKMessage): Promise<void>;
    /**
     * Update session status and metadata
     */
    private updateSessionStatus;
    /**
     * Add result entry from result message
     */
    private addResultEntry;
    /**
     * Extract content from Claude message
     */
    private extractContent;
    /**
     * Extract tool information from Claude assistant message
     */
    private extractToolInfo;
    /**
     * Extract tool_use_id and error status from Claude user message containing tool_result
     */
    private extractToolResultInfo;
    /**
     * Extract tool result content and error status from session entry
     */
    private extractToolResult;
    /**
     * Sync Agent Session Entry to Linear (create AgentActivity)
     */
    private syncEntryToLinear;
    /**
     * Get session by ID
     */
    getSession(linearAgentActivitySessionId: string): CyrusAgentSession | undefined;
    /**
     * Get session entries by session ID
     */
    getSessionEntries(linearAgentActivitySessionId: string): CyrusAgentSessionEntry[];
    /**
     * Get all active sessions
     */
    getActiveSessions(): CyrusAgentSession[];
    /**
     * Add or update agent runner for a session
     */
    addAgentRunner(linearAgentActivitySessionId: string, agentRunner: IAgentRunner): void;
    /**
     *  Get all agent runners
     */
    getAllAgentRunners(): IAgentRunner[];
    /**
     * Get all agent runners for a specific issue
     */
    getAgentRunnersForIssue(issueId: string): IAgentRunner[];
    /**
     * Get sessions by issue ID
     */
    getSessionsByIssueId(issueId: string): CyrusAgentSession[];
    /**
     * Get active sessions by issue ID
     */
    getActiveSessionsByIssueId(issueId: string): CyrusAgentSession[];
    /**
     * Get all sessions
     */
    getAllSessions(): CyrusAgentSession[];
    /**
     * Get sessions that were interrupted (wasRunning === true but no active runner)
     * Used for crash recovery on startup
     */
    getInterruptedSessions(): CyrusAgentSession[];
    /**
     * Get agent runner for a specific session
     */
    getAgentRunner(linearAgentActivitySessionId: string): IAgentRunner | undefined;
    /**
     * Check if an agent runner exists for a session
     */
    hasAgentRunner(linearAgentActivitySessionId: string): boolean;
    /**
     * Create a thought activity
     */
    createThoughtActivity(sessionId: string, body: string): Promise<void>;
    /**
     * Create an action activity
     */
    createActionActivity(sessionId: string, action: string, parameter: string, result?: string): Promise<void>;
    /**
     * Create a response activity
     */
    createResponseActivity(sessionId: string, body: string): Promise<void>;
    /**
     * Create an error activity
     */
    createErrorActivity(sessionId: string, body: string): Promise<void>;
    /**
     * Create an elicitation activity
     */
    createElicitationActivity(sessionId: string, body: string): Promise<void>;
    /**
     * Create an approval elicitation activity with auth signal
     */
    createApprovalElicitation(sessionId: string, body: string, approvalUrl: string): Promise<void>;
    /**
     * Clear completed sessions older than specified time
     */
    cleanup(olderThanMs?: number): void;
    /**
     * Serialize Agent Session state for persistence
     */
    serializeState(): {
        sessions: Record<string, SerializedCyrusAgentSession>;
        entries: Record<string, SerializedCyrusAgentSessionEntry[]>;
    };
    /**
     * Restore Agent Session state from serialized data
     */
    restoreState(serializedSessions: Record<string, SerializedCyrusAgentSession>, serializedEntries: Record<string, SerializedCyrusAgentSessionEntry[]>): void;
    /**
     * Build a conversation summary from stored entries for session recovery.
     * Used when a session resume fails and we need to reconstruct context.
     *
     * @param linearAgentActivitySessionId The session ID to build summary for
     * @returns Summary string or undefined if no entries exist
     */
    buildConversationSummary(linearAgentActivitySessionId: string): string | undefined;
    /**
     * Clear the Claude session ID from a session to allow recovery from stale state.
     * Used when a session resume fails because the session no longer exists.
     *
     * @param linearAgentActivitySessionId The session ID to clear
     */
    clearClaudeSessionId(linearAgentActivitySessionId: string): void;
    /**
     * Post a thought about the model being used
     */
    private postModelNotificationThought;
    /**
     * Post an ephemeral "Analyzing your request..." thought and return the activity ID
     */
    postAnalyzingThought(linearAgentActivitySessionId: string): Promise<string | null>;
    /**
     * Post the procedure selection result as a non-ephemeral thought
     */
    postProcedureSelectionThought(linearAgentActivitySessionId: string, procedureName: string, classification: string): Promise<void>;
    /**
     * Handle status messages (compacting, etc.)
     */
    private handleStatusMessage;
}
//# sourceMappingURL=AgentSessionManager.d.ts.map