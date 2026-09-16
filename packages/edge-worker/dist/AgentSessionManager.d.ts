import { EventEmitter } from "node:events";
import type { SDKMessage, SDKResultMessage, SDKSystemMessage } from "cyrus-claude-runner";
import { type CyrusAgentSession, type CyrusAgentSessionEntry, type IAgentRunner, type ILogger, type IssueMinimal, type RepositoryContext, type SerializedCyrusAgentSession, type SerializedCyrusAgentSessionEntry, type Workspace } from "cyrus-core";
import type { IActivitySink } from "./sinks/index.js";
/**
 * Events emitted by AgentSessionManager
 */
export type AgentSessionManagerEvents = {};
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
 * Single instance shared across all repositories. Activity sinks are
 * registered per-session so each session posts to the correct tracker.
 */
export declare class AgentSessionManager extends EventEmitter {
    private logger;
    private activitySinks;
    private sessions;
    private entries;
    private activeTasksBySession;
    private toolCallsByToolUseId;
    private lastAssistantBodyBySession;
    private lastAssistantBodyIsToolInputBySession;
    private bufferedAssistantEntryBySession;
    private taskSubjectsByToolUseId;
    private taskSubjectsById;
    private activeStatusActivitiesBySession;
    private stopRequestedSessions;
    private messageProcessingQueues;
    private getParentSessionId?;
    private resumeParentSession?;
    constructor(getParentSessionId?: (childSessionId: string) => string | undefined, resumeParentSession?: (parentSessionId: string, prompt: string, childSessionId: string) => Promise<void>, logger?: ILogger);
    /**
     * Register an activity sink for a specific session.
     * This associates the session with the correct issue tracker for activity posting.
     */
    setActivitySink(sessionId: string, sink: IActivitySink): void;
    /**
     * Get the activity sink for a session.
     */
    private getActivitySink;
    /**
     * Get a session-scoped logger with context (sessionId, platform, issueIdentifier).
     */
    private sessionLog;
    /**
     * Initialize an agent session from webhook
     * The session is already created by the platform, we just need to track it
     *
     * @param sessionId - Internal session ID
     * @param issueId - Issue/PR identifier
     * @param issueMinimal - Minimal issue data
     * @param workspace - Workspace configuration
     * @param platform - Source platform ("linear", "github", "gitlab", "slack"). Defaults to "linear".
     *                   Only "linear" sessions will have activities streamed to Linear.
     * @param repositories - Repository contexts for the session (defaults to empty array)
     */
    createCyrusAgentSession(sessionId: string, issueId: string, issueMinimal: IssueMinimal, workspace: Workspace, platform?: "linear" | "github" | "gitlab" | "slack", repositories?: RepositoryContext[]): CyrusAgentSession;
    /**
     * Create an agent session for chat-style platforms (Slack, etc.) that are
     * not tied to a specific issue or repository.
     *
     * Unlike {@link createCyrusAgentSession}, this does NOT require issue
     * context — the session lives in a standalone workspace with no issue
     * tracker linkage.
     *
     * @param repositories - Repository contexts for the session (defaults to empty array for chatbot sessions)
     */
    createChatSession(sessionId: string, workspace: Workspace, platform: string, repositories?: RepositoryContext[]): CyrusAgentSession;
    /**
     * Update Agent Session with session ID from system initialization
     * Automatically detects whether it's Claude or Gemini based on the runner
     */
    updateAgentSessionWithRunnerSessionId(sessionId: string, claudeSystemMessage: SDKSystemMessage): void;
    /**
     * Create a session entry from user/assistant message (without syncing to Linear)
     */
    private createSessionEntry;
    /**
     * Complete a session from Claude result message.
     * Posts the final result to the issue tracker and handles child session completion.
     */
    completeSession(sessionId: string, resultMessage: SDKResultMessage): Promise<void>;
    /**
     * Pending work (scheduled wakeups/crons, in-flight background tasks) for
     * the session's runner, or null when the runner doesn't support pending
     * work reporting or nothing is pending.
     */
    private getRunnerPendingWork;
    private consumeStopRequest;
    requestSessionStop(linearAgentActivitySessionId: string): void;
    /**
     * Handle child session completion and resume parent
     */
    private handleChildSessionCompletion;
    /**
     * Handle streaming Claude messages and route to appropriate methods.
     *
     * Serializes processing per session so concurrent onMessage callbacks from
     * the runner (which is fire-and-forget) do not interleave their async work.
     * Without this serialization, a tool_result message could run its handler
     * ahead of the matching tool_use registration in toolCallsByToolUseId,
     * producing a fallback action="Tool" activity in Linear (seen with parallel
     * deferred tools like ToolSearch).
     */
    handleClaudeMessage(sessionId: string, message: SDKMessage): Promise<void>;
    /**
     * Actual message dispatch. Invoked only via the per-session queue in
     * handleClaudeMessage so at most one instance runs for a given session.
     */
    private processClaudeMessage;
    /**
     * Flush the buffered assistant entry as thought/action (non-result flush).
     * Called when a new message arrives before result, to post the previous
     * assistant message as a thought/action activity.
     */
    private flushBufferedAssistant;
    /**
     * Handle rate limit events from Claude runners
     */
    private handleRateLimitEvent;
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
     * Sync session entry to external tracker (create AgentActivity)
     */
    private syncEntryToActivitySink;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): CyrusAgentSession | undefined;
    /**
     * Get session entries by session ID
     */
    getSessionEntries(sessionId: string): CyrusAgentSessionEntry[];
    /**
     * Get all active sessions
     */
    getActiveSessions(): CyrusAgentSession[];
    /**
     * Add or update agent runner for a session
     */
    addAgentRunner(sessionId: string, agentRunner: IAgentRunner): void;
    /**
     *  Get all agent runners
     */
    getAllAgentRunners(): IAgentRunner[];
    /**
     * Resolve the issue ID from a session, checking issueContext first then deprecated issueId.
     */
    private getSessionIssueId;
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
     * Get active sessions where the issue's branch name matches the given branch.
     * Useful for detecting when multiple sessions share the same worktree.
     */
    getActiveSessionsByBranchName(branchName: string): CyrusAgentSession[];
    /**
     * Get active sessions tracking a given base branch for a specific repository.
     * Used by GitHub push webhook handling to notify agents when their base branch receives new commits.
     */
    getSessionsByBaseBranch(baseBranchName: string, repositoryId: string): CyrusAgentSession[];
    /**
     * Find an active multi-repo session that includes the given repository.
     * Used by GitHub webhook handling to resolve the correct sub-worktree
     * when a @ mention targets a specific repo within a multi-repo workspace.
     */
    getActiveMultiRepoSessionForRepository(repositoryId: string): CyrusAgentSession | null;
    /**
     * Get all sessions
     */
    getAllSessions(): CyrusAgentSession[];
    /**
     * Get sessions that were interrupted (wasRunning === true but no active runner)
     * Used for crash recovery on startup.
     *
     * Note: We intentionally do NOT filter by status === Active here.
     * Between subroutines, status is set to "complete" by completeSession()
     * before the next subroutine starts and sets wasRunning back to true.
     * The wasRunning flag is the definitive signal for interrupted sessions.
     */
    getInterruptedSessions(): CyrusAgentSession[];
    /**
     * Reset session status to Active for crash recovery.
     * Used when resuming interrupted sessions that may have
     * status=Complete from a completed subroutine.
     */
    resetSessionStatusForRecovery(linearAgentActivitySessionId: string): void;
    /**
     * Mark a session as error state and clear wasRunning flag.
     * Used by EdgeWorker for crash recovery when max retries are exhausted.
     */
    markSessionAsError(linearAgentActivitySessionId: string): Promise<void>;
    /**
     * Get agent runner for a specific session
     */
    getAgentRunner(sessionId: string): IAgentRunner | undefined;
    /**
     * Check if an agent runner exists for a session
     */
    hasAgentRunner(sessionId: string): boolean;
    /**
     * Post an activity to the activity sink for a session.
     * Consolidates session lookup, externalSessionId guard, try/catch, and logging.
     *
     * @returns The activity ID when resolved, `null` otherwise.
     */
    private postActivity;
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
     * Remove a session and all associated tracking state.
     * Use for immediate cleanup when a session is permanently done
     * (e.g., issue moved to terminal state).
     */
    removeSession(sessionId: string): void;
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
    private formatModelNotification;
    private getSessionRunnerType;
    /**
     * Post an ephemeral "Analyzing your request..." thought and return the activity ID
     */
    postAnalyzingThought(sessionId: string): Promise<string | null>;
    /**
     * Handle status messages (compacting, etc.)
     */
    private handleStatusMessage;
}
//# sourceMappingURL=AgentSessionManager.d.ts.map