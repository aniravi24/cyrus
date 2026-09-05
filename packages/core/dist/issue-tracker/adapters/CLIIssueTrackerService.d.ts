/**
 * CLI/in-memory implementation of IIssueTrackerService.
 *
 * This adapter provides an in-memory mock of Linear's issue tracking platform
 * for testing purposes. It implements all methods from IIssueTrackerService
 * while storing data in memory using Maps for O(1) lookups.
 *
 * Unlike Linear's async properties, this implementation uses synchronous properties
 * for immediate access to related entities.
 *
 * @module issue-tracker/adapters/CLIIssueTrackerService
 */
import { EventEmitter } from "node:events";
import type { AgentEventTransportConfig, IAgentEventTransport } from "../IAgentEventTransport.js";
import type { IIssueTrackerService } from "../IIssueTrackerService.js";
import { type AgentActivityCreateInput, type AgentActivityPayload, type AgentSessionCreateOnCommentInput, type AgentSessionCreateOnIssueInput, AgentSessionStatus, type Comment, type CommentCreateInput, type CommentWithAttachments, type Connection, type FetchChildrenOptions, type FileUploadRequest, type FileUploadResponse, type Issue, type IssueCreateInput, type IssueTrackerAgentSession, type IssueTrackerAgentSessionPayload, type IssueUpdateInput, type IssueWithChildren, type Label, type PaginationOptions, type Team, type User, type WorkflowState } from "../types.js";
import { type CLIAgentActivityData, type CLIAgentSessionData, type CLICommentData, type CLIIssueData, type CLILabelData, type CLITeamData, type CLIUserData, type CLIWorkflowStateData } from "./CLITypes.js";
/**
 * In-memory state for the CLI issue tracker.
 */
export interface CLIIssueTrackerState {
    issues: Map<string, CLIIssueData>;
    comments: Map<string, CLICommentData>;
    teams: Map<string, CLITeamData>;
    labels: Map<string, CLILabelData>;
    workflowStates: Map<string, CLIWorkflowStateData>;
    users: Map<string, CLIUserData>;
    agentSessions: Map<string, CLIAgentSessionData>;
    agentActivities: Map<string, CLIAgentActivityData>;
    currentUserId: string;
    issueCounter: number;
    commentCounter: number;
    sessionCounter: number;
    activityCounter: number;
}
/**
 * CLI implementation of IIssueTrackerService.
 *
 * This class provides an in-memory implementation of the issue tracker service
 * for testing purposes. All data is stored in Maps with synchronous property access.
 *
 * @example
 * ```typescript
 * const service = new CLIIssueTrackerService();
 *
 * // Fetch an issue
 * const issue = await service.fetchIssue('issue-1');
 *
 * // Create a comment
 * const comment = await service.createComment(issue.id, {
 *   body: 'This is a comment'
 * });
 * ```
 */
export declare class CLIIssueTrackerService extends EventEmitter implements IIssueTrackerService {
    private state;
    private eventTransport;
    /**
     * Create a new CLIIssueTrackerService.
     *
     * @param initialState - Optional initial state (useful for testing)
     */
    constructor(initialState?: Partial<CLIIssueTrackerState>);
    /**
     * Fetch a single issue by ID or identifier.
     */
    fetchIssue(idOrIdentifier: string): Promise<Issue>;
    /**
     * Create a new issue in a team.
     *
     * @param input - Issue creation parameters
     * @returns Promise resolving to the created issue
     */
    createIssue(input: IssueCreateInput): Promise<Issue>;
    /**
     * Get priority label from priority number.
     */
    private getPriorityLabel;
    /**
     * Fetch child issues (sub-issues) for a parent issue.
     */
    fetchIssueChildren(issueId: string, options?: FetchChildrenOptions): Promise<IssueWithChildren>;
    /**
     * Update an issue's properties.
     */
    updateIssue(issueId: string, updates: IssueUpdateInput): Promise<Issue>;
    /**
     * Fetch attachments for an issue.
     */
    fetchIssueAttachments(issueId: string): Promise<Array<{
        title: string;
        url: string;
    }>>;
    /**
     * Fetch comments for an issue with optional pagination.
     */
    fetchComments(issueId: string, options?: PaginationOptions): Promise<Connection<Comment>>;
    /**
     * Fetch a single comment by ID.
     */
    fetchComment(commentId: string): Promise<Comment>;
    /**
     * Fetch a comment with attachments.
     */
    fetchCommentWithAttachments(commentId: string): Promise<CommentWithAttachments>;
    /**
     * Create a comment on an issue.
     */
    createComment(issueId: string, input: CommentCreateInput): Promise<Comment>;
    /**
     * Fetch all teams in the workspace/organization.
     */
    fetchTeams(options?: PaginationOptions): Promise<Connection<Team>>;
    /**
     * Fetch a single team by ID or key.
     */
    fetchTeam(idOrKey: string): Promise<Team>;
    /**
     * Fetch all issue labels in the workspace/organization.
     */
    fetchLabels(options?: PaginationOptions): Promise<Connection<Label>>;
    /**
     * Fetch a single label by ID or name.
     */
    fetchLabel(idOrName: string): Promise<Label>;
    /**
     * Fetch label names for a specific issue.
     */
    getIssueLabels(issueId: string): Promise<string[]>;
    /**
     * Find a label by name or create it if it doesn't exist.
     * This enables dynamic label creation on first use.
     *
     * @param name - The label name to find or create
     * @returns The label ID
     */
    findOrCreateLabel(name: string): Promise<string>;
    /**
     * Generate a consistent color for a label based on its name.
     * Uses a simple hash to pick from a palette of colors.
     */
    private generateLabelColor;
    /**
     * Fetch workflow states for a team.
     */
    fetchWorkflowStates(teamId: string, options?: PaginationOptions): Promise<Connection<WorkflowState>>;
    /**
     * Fetch a single workflow state by ID.
     */
    fetchWorkflowState(stateId: string): Promise<WorkflowState>;
    /**
     * Fetch a user by ID.
     */
    fetchUser(userId: string): Promise<User>;
    /**
     * Fetch the current authenticated user.
     */
    fetchCurrentUser(): Promise<User>;
    /**
     * Create an agent session on an issue.
     */
    createAgentSessionOnIssue(input: AgentSessionCreateOnIssueInput): Promise<IssueTrackerAgentSessionPayload>;
    /**
     * Create an agent session on a comment thread.
     */
    createAgentSessionOnComment(input: AgentSessionCreateOnCommentInput): Promise<IssueTrackerAgentSessionPayload>;
    /**
     * Internal helper to create agent sessions.
     */
    private createAgentSessionInternal;
    /**
     * Fetch an agent session by ID.
     */
    fetchAgentSession(sessionId: string): Promise<IssueTrackerAgentSession>;
    /**
     * List agent sessions with optional filtering.
     *
     * @param options - Filtering options (issueId, limit, offset)
     * @returns Array of agent session data
     */
    listAgentSessions(options?: {
        issueId?: string;
        limit?: number;
        offset?: number;
    }): CLIAgentSessionData[];
    /**
     * Update an agent session's status.
     *
     * @param sessionId - The session ID to update
     * @param status - The new status
     * @returns The updated session
     */
    updateAgentSessionStatus(sessionId: string, status: AgentSessionStatus): Promise<IssueTrackerAgentSession>;
    /**
     * Emit a stop signal webhook event for the EdgeWorker to handle.
     * Should be called by the caller after stopping a session (e.g., CLIRPCServer.handleStopSession).
     */
    emitStopSignalEvent(sessionId: string): Promise<void>;
    /**
     * Terminate an issue by moving it to a terminal state (completed / canceled /
     * deleted) and emit an {@link IssueStateChangeMessage} on the unified message
     * bus. This mirrors what {@link LinearMessageTranslator} does for real Linear
     * `issueStatusChanged` / `Issue.remove` webhooks, so the EdgeWorker's
     * terminal-state cleanup path (worktree removal, `cyrus-teardown.sh`, etc.)
     * is exercised the same way in F1 as it is in production.
     *
     * For `"deleted"` the issue is removed from the in-memory state; for
     * `"completed"` / `"canceled"` the issue's `stateId` is moved to the seeded
     * `state-done` / `state-canceled` workflow state respectively.
     *
     * @param issueId - The issue ID to terminate
     * @param action - Terminal action: "completed", "canceled", or "deleted"
     * @returns The issue's identifier (e.g., "DEF-1")
     */
    terminateIssue(issueId: string, action: "completed" | "canceled" | "deleted"): Promise<string>;
    /**
     * Prompt an agent session with a user message.
     * This creates a comment on the associated issue and emits a prompted event.
     *
     * @param sessionId - The session ID to prompt
     * @param message - The user's prompt message
     * @returns The created comment
     */
    promptAgentSession(sessionId: string, message: string): Promise<Comment>;
    /**
     * Post an agent activity to an agent session.
     */
    createAgentActivity(input: AgentActivityCreateInput): Promise<AgentActivityPayload>;
    /**
     * List agent activities for a session.
     *
     * @param sessionId - The session ID to get activities for
     * @param options - Pagination options
     * @returns Array of agent activity data
     */
    listAgentActivities(sessionId: string, options?: {
        limit?: number;
        offset?: number;
    }): CLIAgentActivityData[];
    /**
     * Request a file upload URL from the platform.
     */
    requestFileUpload(request: FileUploadRequest): Promise<FileUploadResponse>;
    /**
     * Get the platform type identifier.
     */
    getPlatformType(): string;
    /**
     * Get the platform's API version or other metadata.
     */
    getPlatformMetadata(): Record<string, unknown>;
    /**
     * Create an event transport for receiving webhook events.
     *
     * @param config - Transport configuration
     * @returns CLI event transport implementation
     */
    createEventTransport(config: AgentEventTransportConfig): IAgentEventTransport;
    /**
     * Seed default teams and workflow states for testing.
     * Creates a "default" team with standard workflow states.
     */
    seedDefaultData(): void;
    /**
     * Get the current in-memory state (for testing/debugging).
     */
    getState(): CLIIssueTrackerState;
}
//# sourceMappingURL=CLIIssueTrackerService.d.ts.map