/**
 * Linear-specific implementation of IIssueTrackerService.
 *
 * This adapter wraps the @linear/sdk LinearClient to provide a platform-agnostic
 * interface for issue tracking operations. It transforms Linear-specific types
 * to the platform-agnostic types defined in ../types.ts.
 *
 * @module issue-tracker/adapters/LinearIssueTrackerService
 */
import type { LinearClient } from "@linear/sdk";
/**
 * OAuth configuration for automatic token refresh.
 */
export interface LinearOAuthConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    /** Workspace ID for coalescing concurrent refreshes across instances */
    workspaceId: string;
    /** Called when tokens are refreshed - use to persist new tokens */
    onTokenRefresh?: (tokens: {
        accessToken: string;
        refreshToken: string;
    }) => void | Promise<void>;
}
import type { AgentActivityCreateInput, AgentActivityPayload, AgentEventTransportConfig, AgentSessionCreateOnCommentInput, AgentSessionCreateOnIssueInput, Comment, CommentCreateInput, CommentWithAttachments, Connection, FetchChildrenOptions, FileUploadRequest, FileUploadResponse, IAgentEventTransport, IIssueTrackerService, Issue, IssueUpdateInput, IssueWithChildren, Label, PaginationOptions, Team, User, WorkflowState } from "cyrus-core";
/**
 * Linear implementation of IIssueTrackerService.
 *
 * This class wraps the Linear SDK's LinearClient and provides a platform-agnostic
 * interface for all issue tracking operations. It handles type conversions between
 * Linear-specific types and platform-agnostic types.
 *
 * @example
 * ```typescript
 * const linearClient = new LinearClient({ accessToken: 'your-token' });
 * const service = new LinearIssueTrackerService(linearClient);
 *
 * // Fetch an issue
 * const issue = await service.fetchIssue('TEAM-123');
 *
 * // Create a comment
 * const comment = await service.createComment(issue.id, {
 *   body: 'This is a comment'
 * });
 * ```
 */
export declare class LinearIssueTrackerService implements IIssueTrackerService {
    private readonly linearClient;
    private oauthConfig?;
    /**
     * Static map for workspace-level coalescing of concurrent token refreshes.
     * Multiple instances sharing the same workspace will share a single refresh HTTP call.
     */
    private static pendingRefreshes;
    /**
     * Static map storing the current refresh token per workspace.
     * All instances sharing a workspace read/write from this shared state.
     */
    private static workspaceRefreshTokens;
    /**
     * Create a new LinearIssueTrackerService.
     *
     * @param linearClient - Configured LinearClient instance
     * @param oauthConfig - Optional OAuth config for automatic token refresh on 401 errors
     */
    constructor(linearClient: LinearClient, oauthConfig?: LinearOAuthConfig);
    /**
     * Performs the OAuth token refresh with workspace-level coalescing.
     * Multiple concurrent refresh requests for the same workspace share a single HTTP call.
     * @returns The new access token
     */
    private doTokenRefresh;
    /**
     * Executes the actual OAuth token refresh HTTP request.
     * @internal
     */
    private executeTokenRefresh;
    /**
     * Check if an error is a 401 token expiration error.
     */
    private isTokenExpiredError;
    /**
     * Update the access token using setHeader on the underlying GraphQL client.
     * This is more efficient than recreating the entire LinearClient.
     * @param token - New access token
     */
    setAccessToken(token: string): void;
    /**
     * Fetch a single issue by ID or identifier.
     */
    fetchIssue(idOrIdentifier: string): Promise<Issue>;
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
     *
     * Uses the Linear SDK to fetch native attachments (typically external links
     * to Sentry errors, Datadog reports, etc.)
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
     *
     * @param commentId - Comment ID to fetch
     * @returns Promise resolving to comment with attachments
     * @throws Error if comment not found or request fails
     *
     * @remarks
     * **LIMITATION**: This method currently returns an empty `attachments` array
     * because Linear's GraphQL API does not expose comment attachment metadata
     * through their SDK or documented API endpoints.
     *
     * This is expected behavior, not a bug. Issue attachments (via `fetchIssueAttachments`)
     * work correctly - only comment attachments are unavailable from the Linear API.
     *
     * If you need comment attachments, consider:
     * - Using issue attachments instead (`fetchIssueAttachments`)
     * - Parsing attachment URLs from comment body markdown
     * - Waiting for Linear to expose this data in their API
     *
     * Implementation detail: The returned comment object is a Linear SDK Comment
     * with an empty `attachments` array property added.
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
     * Uses native SDK method - direct passthrough to Linear SDK.
     */
    createAgentSessionOnIssue(input: AgentSessionCreateOnIssueInput): import("@linear/sdk").LinearFetch<import("@linear/sdk").AgentSessionPayload>;
    /**
     * Create an agent session on a comment thread.
     * Uses native SDK method - direct passthrough to Linear SDK.
     */
    createAgentSessionOnComment(input: AgentSessionCreateOnCommentInput): import("@linear/sdk").LinearFetch<import("@linear/sdk").AgentSessionPayload>;
    /**
     * Fetch an agent session by ID.
     * Uses native SDK method - direct passthrough to Linear SDK.
     */
    fetchAgentSession(sessionId: string): import("@linear/sdk").LinearFetch<import("@linear/sdk").AgentSession>;
    /**
     * Emit a stop signal webhook event.
     * No-op for Linear - stop signals come from Linear webhooks, not from us.
     */
    emitStopSignalEvent(_sessionId: string): Promise<void>;
    /**
     * Post an agent activity to an agent session.
     * Signature matches Linear SDK's createAgentActivity exactly.
     */
    createAgentActivity(input: AgentActivityCreateInput): Promise<AgentActivityPayload>;
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
     * Create an event transport for receiving Linear webhook events.
     *
     * @param config - Transport configuration
     * @returns Linear event transport implementation
     */
    createEventTransport(config: AgentEventTransportConfig): IAgentEventTransport;
}
//# sourceMappingURL=LinearIssueTrackerService.d.ts.map