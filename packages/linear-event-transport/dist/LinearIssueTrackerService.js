/**
 * Linear-specific implementation of IIssueTrackerService.
 *
 * This adapter wraps the @linear/sdk LinearClient to provide a platform-agnostic
 * interface for issue tracking operations. It transforms Linear-specific types
 * to the platform-agnostic types defined in ../types.ts.
 *
 * @module issue-tracker/adapters/LinearIssueTrackerService
 */
import { createLogger } from "cyrus-core";
import { LinearEventTransport } from "./LinearEventTransport.js";
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
export class LinearIssueTrackerService {
    linearClient;
    oauthConfig;
    logger;
    refreshPromise = null;
    /**
     * Static map for workspace-level coalescing of concurrent token refreshes.
     * Multiple instances sharing the same workspace will share a single refresh HTTP call.
     */
    static pendingRefreshes = new Map();
    /**
     * Static map storing the current refresh token per workspace.
     * All instances sharing a workspace read/write from this shared state.
     */
    static workspaceRefreshTokens = new Map();
    /**
     * Create a new LinearIssueTrackerService.
     *
     * @param linearClient - Configured LinearClient instance
     * @param oauthConfig - Optional OAuth config for automatic token refresh on 401 errors
     * @param logger - Optional logger instance
     */
    constructor(linearClient, oauthConfig, logger) {
        this.linearClient = linearClient;
        this.oauthConfig = oauthConfig;
        this.logger =
            logger ?? createLogger({ component: "LinearIssueTrackerService" });
        // Register initial refresh token in shared static map
        if (oauthConfig?.refreshToken) {
            LinearIssueTrackerService.workspaceRefreshTokens.set(oauthConfig.workspaceId, oauthConfig.refreshToken);
        }
        // Only patch if oauthConfig is provided AND linearClient.client exists
        // (the .client property may not exist in test mocks)
        if (oauthConfig && linearClient.client) {
            const client = linearClient.client;
            const originalRequest = client.request.bind(client);
            // Track the current refresh promise - coalesces concurrent 401 errors.
            // Cleared when refresh fails or when setAccessToken() is called.
            client.request = async (document, variables, requestHeaders, isRetry = false) => {
                try {
                    return (await originalRequest(document, variables, requestHeaders));
                }
                catch (error) {
                    // Don't retry if this is already a retry attempt (prevents infinite loops)
                    // or if it's not a token expiration error
                    if (isRetry || !this.isTokenExpiredError(error))
                        throw error;
                    // Coalesce concurrent refresh attempts - everyone shares the same promise.
                    if (!this.refreshPromise) {
                        this.refreshPromise = this.doTokenRefresh().catch((refreshError) => {
                            // On failure, clear the promise so next 401 can retry fresh
                            this.refreshPromise = null;
                            this.logger.error("Token refresh failed:", refreshError);
                            throw refreshError;
                        });
                    }
                    try {
                        const newToken = await this.refreshPromise;
                        // Clear cached promise so future token expirations trigger a fresh refresh.
                        // Workspace-level coalescing via pendingRefreshes still deduplicates concurrent calls.
                        this.refreshPromise = null;
                        client.setHeader("Authorization", `Bearer ${newToken}`);
                        // Retry the request with the new token (marked as retry to prevent loops)
                        return (await client.request(document, variables, requestHeaders, true));
                    }
                    catch (_refreshError) {
                        // If refresh failed, throw the original 401 error for clarity
                        throw error;
                    }
                }
            };
        }
    }
    /**
     * Performs the OAuth token refresh with workspace-level coalescing.
     * Multiple concurrent refresh requests for the same workspace share a single HTTP call.
     * @returns The new access token
     */
    async doTokenRefresh() {
        if (!this.oauthConfig) {
            throw new Error("OAuth config not provided");
        }
        const { workspaceId } = this.oauthConfig;
        // Check if there's already a pending refresh for this workspace
        const pendingRefresh = LinearIssueTrackerService.pendingRefreshes.get(workspaceId);
        if (pendingRefresh) {
            this.logger.info(`Coalescing token refresh for workspace ${workspaceId}`);
            return pendingRefresh;
        }
        // Create the refresh promise and store it
        const refreshPromise = this.executeTokenRefresh();
        LinearIssueTrackerService.pendingRefreshes.set(workspaceId, refreshPromise);
        try {
            return await refreshPromise;
        }
        finally {
            // One of the key guarantees of finally — it runs regardless of how the try block exits (return, throw, or normal completion).
            LinearIssueTrackerService.pendingRefreshes.delete(workspaceId);
        }
    }
    /**
     * Executes the actual OAuth token refresh HTTP request.
     * @internal
     */
    async executeTokenRefresh() {
        const { clientId, clientSecret, workspaceId, onTokenRefresh } = this.oauthConfig;
        // Read current refresh token from shared static map (may have been updated by another instance)
        const refreshToken = LinearIssueTrackerService.workspaceRefreshTokens.get(workspaceId);
        if (!refreshToken) {
            throw new Error(`No refresh token available for workspace ${workspaceId}`);
        }
        this.logger.info(`Refreshing token for workspace ${workspaceId}...`);
        const params = new URLSearchParams({
            grant_type: "refresh_token",
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        });
        // https://linear.app/developers/oauth-2-0-authentication
        const response = await fetch("https://api.linear.app/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.status}`);
        }
        const data = (await response.json());
        // Update shared static map for all instances sharing this workspace
        LinearIssueTrackerService.workspaceRefreshTokens.set(workspaceId, data.refresh_token);
        // Notify caller so they can persist tokens to disk
        if (onTokenRefresh) {
            try {
                await onTokenRefresh({
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                });
            }
            catch (err) {
                this.logger.error("onTokenRefresh callback failed:", err);
            }
        }
        this.logger.info(`Token refreshed successfully for workspace ${workspaceId}`);
        return data.access_token;
    }
    /**
     * Check if an error is a 401 token expiration error.
     */
    isTokenExpiredError(error) {
        const err = error;
        return err?.status === 401 || err?.response?.status === 401;
    }
    /**
     * Update the access token using setHeader on the underlying GraphQL client.
     * This is more efficient than recreating the entire LinearClient.
     * @param token - New access token
     */
    setAccessToken(token) {
        // Clear any cached refresh promise so subsequent 401s trigger a fresh refresh
        // rather than reusing a stale resolved promise with an old token.
        this.refreshPromise = null;
        // Guard for test mocks that may not have the .client property
        if (this.linearClient.client) {
            this.linearClient.client.setHeader("Authorization", `Bearer ${token}`);
        }
    }
    /**
     * Get the underlying LinearClient instance.
     * Useful when callers need the same client with its OAuth refresh interceptor.
     */
    getClient() {
        return this.linearClient;
    }
    // ========================================================================
    // ISSUE OPERATIONS
    // ========================================================================
    /**
     * Fetch a single issue by ID or identifier.
     */
    async fetchIssue(idOrIdentifier) {
        return await this.linearClient.issue(idOrIdentifier);
    }
    /**
     * Fetch child issues (sub-issues) for a parent issue.
     */
    async fetchIssueChildren(issueId, options) {
        try {
            const parentIssue = await this.linearClient.issue(issueId);
            // Build filter based on options
            const filter = {};
            if (options?.includeCompleted === false) {
                filter.state = { type: { neq: "completed" } };
            }
            if (options?.includeArchived === false) {
                filter.archivedAt = { null: true };
            }
            // Merge with additional filters
            if (options?.filter) {
                Object.assign(filter, options.filter);
            }
            // Fetch children with filter
            const childrenConnection = await parentIssue.children({
                first: options?.limit ?? 50,
                filter,
            });
            const children = childrenConnection.nodes ?? [];
            // Return issue with children array directly from Linear SDK
            // Cast to IssueWithChildren since Linear SDK types are compatible
            return Object.assign(parentIssue, {
                children,
                childCount: children.length,
            });
        }
        catch (error) {
            const err = new Error(`Failed to fetch children for issue ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    /**
     * Update an issue's properties.
     */
    async updateIssue(issueId, updates) {
        try {
            const updatePayload = await this.linearClient.updateIssue(issueId, updates);
            if (!updatePayload.success) {
                throw new Error("Linear API returned success=false");
            }
            // Fetch the updated issue
            const updatedIssue = await updatePayload.issue;
            if (!updatedIssue) {
                throw new Error("Updated issue not returned from Linear API");
            }
            return updatedIssue;
        }
        catch (error) {
            const err = new Error(`Failed to update issue ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    /**
     * Fetch attachments for an issue.
     *
     * Uses the Linear SDK to fetch native attachments (typically external links
     * to Sentry errors, Datadog reports, etc.)
     */
    async fetchIssueAttachments(issueId) {
        try {
            const issue = await this.linearClient.issue(issueId);
            if (!issue) {
                throw new Error(`Issue ${issueId} not found`);
            }
            // Call the Linear SDK's attachments() method which returns a Connection
            const attachmentsConnection = await issue.attachments();
            // Extract title and url from each attachment node
            return attachmentsConnection.nodes.map((attachment) => ({
                title: attachment.title || "Untitled attachment",
                url: attachment.url,
            }));
        }
        catch (error) {
            const err = new Error(`Failed to fetch attachments for issue ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    // ========================================================================
    // COMMENT OPERATIONS
    // ========================================================================
    /**
     * Fetch comments for an issue with optional pagination.
     */
    async fetchComments(issueId, options) {
        try {
            const issue = await this.linearClient.issue(issueId);
            const commentsConnection = await issue.comments({
                first: options?.first ?? 50,
                after: options?.after,
                before: options?.before,
            });
            return {
                nodes: commentsConnection.nodes ?? [],
                pageInfo: commentsConnection.pageInfo
                    ? {
                        hasNextPage: commentsConnection.pageInfo.hasNextPage,
                        hasPreviousPage: commentsConnection.pageInfo.hasPreviousPage,
                        startCursor: commentsConnection.pageInfo.startCursor,
                        endCursor: commentsConnection.pageInfo.endCursor,
                    }
                    : undefined,
            };
        }
        catch (error) {
            const err = new Error(`Failed to fetch comments for issue ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    /**
     * Fetch a single comment by ID.
     */
    async fetchComment(commentId) {
        return await this.linearClient.comment({ id: commentId });
    }
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
    async fetchCommentWithAttachments(commentId) {
        try {
            // Fetch the comment using the Linear SDK
            const comment = await this.fetchComment(commentId);
            // Return comment with empty attachments array (Linear API doesn't expose comment attachments)
            // Cast to CommentWithAttachments since Linear SDK types are compatible
            return Object.assign(comment, {
                attachments: [],
            });
        }
        catch (error) {
            const err = new Error(`Failed to fetch comment with attachments ${commentId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    /**
     * Create a comment on an issue.
     */
    async createComment(issueId, input) {
        try {
            // Build the comment body, optionally appending attachment URLs
            let finalBody = input.body;
            // If attachment URLs are provided, append them to the comment body as markdown
            if (input.attachmentUrls && input.attachmentUrls.length > 0) {
                const attachmentMarkdown = input.attachmentUrls
                    .map((url) => {
                    // Detect if the URL is an image based on file extension
                    // Matches common image extensions followed by query params (?), fragments (#), or end of string ($)
                    // Examples: image.png, image.png?v=123, image.png#section, image.png?w=500&h=300
                    const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp)(\?|#|$)/i.test(url);
                    if (isImage) {
                        // Embed as markdown image
                        return `![attachment](${url})`;
                    }
                    // Otherwise, embed as markdown link
                    return `[attachment](${url})`;
                })
                    .join("\n");
                // Append attachments to the body with a separator if body is not empty
                finalBody = input.body
                    ? `${input.body}\n\n${attachmentMarkdown}`
                    : attachmentMarkdown;
            }
            const createPayload = await this.linearClient.createComment({
                issueId,
                body: finalBody,
                parentId: input.parentId,
            });
            if (!createPayload.success) {
                throw new Error("Linear API returned success=false");
            }
            const createdComment = await createPayload.comment;
            if (!createdComment) {
                throw new Error("Created comment not returned from Linear API");
            }
            return createdComment;
        }
        catch (error) {
            const err = new Error(`Failed to create comment on issue ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    // ========================================================================
    // TEAM OPERATIONS
    // ========================================================================
    /**
     * Fetch all teams in the workspace/organization.
     */
    async fetchTeams(options) {
        try {
            const teamsConnection = await this.linearClient.teams({
                first: options?.first ?? 50,
                after: options?.after,
                before: options?.before,
            });
            return {
                nodes: teamsConnection.nodes ?? [],
                pageInfo: teamsConnection.pageInfo
                    ? {
                        hasNextPage: teamsConnection.pageInfo.hasNextPage,
                        hasPreviousPage: teamsConnection.pageInfo.hasPreviousPage,
                        startCursor: teamsConnection.pageInfo.startCursor,
                        endCursor: teamsConnection.pageInfo.endCursor,
                    }
                    : undefined,
            };
        }
        catch (error) {
            const err = new Error(`Failed to fetch teams: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    /**
     * Fetch a single team by ID or key.
     */
    async fetchTeam(idOrKey) {
        return await this.linearClient.team(idOrKey);
    }
    // ========================================================================
    // LABEL OPERATIONS
    // ========================================================================
    /**
     * Fetch all issue labels in the workspace/organization.
     */
    async fetchLabels(options) {
        try {
            const labelsConnection = await this.linearClient.issueLabels({
                first: options?.first ?? 50,
                after: options?.after,
                before: options?.before,
            });
            return {
                nodes: labelsConnection.nodes ?? [],
                pageInfo: labelsConnection.pageInfo
                    ? {
                        hasNextPage: labelsConnection.pageInfo.hasNextPage,
                        hasPreviousPage: labelsConnection.pageInfo.hasPreviousPage,
                        startCursor: labelsConnection.pageInfo.startCursor,
                        endCursor: labelsConnection.pageInfo.endCursor,
                    }
                    : undefined,
            };
        }
        catch (error) {
            const err = new Error(`Failed to fetch labels: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    /**
     * Fetch a single label by ID or name.
     */
    async fetchLabel(idOrName) {
        return await this.linearClient.issueLabel(idOrName);
    }
    /**
     * Fetch label names for a specific issue.
     */
    async getIssueLabels(issueId) {
        try {
            const issue = await this.linearClient.issue(issueId);
            const labels = await issue.labels();
            return labels.nodes.map((label) => label.name);
        }
        catch (error) {
            const err = new Error(`Failed to fetch issue labels for ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    // ========================================================================
    // WORKFLOW STATE OPERATIONS
    // ========================================================================
    /**
     * Fetch workflow states for a team.
     */
    async fetchWorkflowStates(teamId, options) {
        try {
            const team = await this.linearClient.team(teamId);
            const statesConnection = await team.states({
                first: options?.first ?? 50,
                after: options?.after,
                before: options?.before,
            });
            return {
                nodes: statesConnection.nodes ?? [],
                pageInfo: statesConnection.pageInfo
                    ? {
                        hasNextPage: statesConnection.pageInfo.hasNextPage,
                        hasPreviousPage: statesConnection.pageInfo.hasPreviousPage,
                        startCursor: statesConnection.pageInfo.startCursor,
                        endCursor: statesConnection.pageInfo.endCursor,
                    }
                    : undefined,
            };
        }
        catch (error) {
            const err = new Error(`Failed to fetch workflow states for team ${teamId}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    /**
     * Fetch a single workflow state by ID.
     */
    async fetchWorkflowState(stateId) {
        return await this.linearClient.workflowState(stateId);
    }
    // ========================================================================
    // USER OPERATIONS
    // ========================================================================
    /**
     * Fetch a user by ID.
     */
    async fetchUser(userId) {
        return await this.linearClient.user(userId);
    }
    /**
     * Fetch the current authenticated user.
     */
    async fetchCurrentUser() {
        return await this.linearClient.viewer;
    }
    // ========================================================================
    // AGENT SESSION OPERATIONS
    // ========================================================================
    /**
     * Create an agent session on an issue.
     * Uses native SDK method - direct passthrough to Linear SDK.
     */
    createAgentSessionOnIssue(input) {
        return this.linearClient.agentSessionCreateOnIssue(input);
    }
    /**
     * Create an agent session on a comment thread.
     * Uses native SDK method - direct passthrough to Linear SDK.
     */
    createAgentSessionOnComment(input) {
        return this.linearClient.agentSessionCreateOnComment(input);
    }
    /**
     * Fetch an agent session by ID.
     * Uses native SDK method - direct passthrough to Linear SDK.
     */
    fetchAgentSession(sessionId) {
        return this.linearClient.agentSession(sessionId);
    }
    /**
     * Emit a stop signal webhook event.
     * No-op for Linear - stop signals come from Linear webhooks, not from us.
     */
    async emitStopSignalEvent(_sessionId) {
        // No-op for Linear implementation - stop signals are handled via Linear webhooks
    }
    // ========================================================================
    // AGENT ACTIVITY OPERATIONS
    // ========================================================================
    /**
     * Post an agent activity to an agent session.
     * Signature matches Linear SDK's createAgentActivity exactly.
     */
    async createAgentActivity(input) {
        return await this.linearClient.createAgentActivity(input);
    }
    // ========================================================================
    // FILE OPERATIONS
    // ========================================================================
    /**
     * Request a file upload URL from the platform.
     */
    async requestFileUpload(request) {
        try {
            const uploadPayload = await this.linearClient.fileUpload(request.contentType, request.filename, request.size, {
                makePublic: request.makePublic ?? false,
            });
            if (!uploadPayload.success) {
                throw new Error("Linear API returned success=false");
            }
            // Access the upload file result
            const uploadFile = await uploadPayload.uploadFile;
            if (!uploadFile) {
                throw new Error("Upload file not returned from Linear API");
            }
            // Convert headers array to record
            const headersRecord = {};
            if (uploadFile.headers) {
                for (const header of uploadFile.headers) {
                    if (header.key && header.value) {
                        headersRecord[header.key] = header.value;
                    }
                }
            }
            return {
                uploadUrl: uploadFile.uploadUrl ?? "",
                headers: headersRecord,
                assetUrl: uploadFile.assetUrl ?? "",
            };
        }
        catch (error) {
            const err = new Error(`Failed to request file upload for ${request.filename}: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                err.cause = error;
            }
            throw err;
        }
    }
    // ========================================================================
    // PLATFORM METADATA
    // ========================================================================
    /**
     * Get the platform type identifier.
     */
    getPlatformType() {
        return "linear";
    }
    /**
     * Get the platform's API version or other metadata.
     */
    getPlatformMetadata() {
        return {
            platform: "linear",
            sdkVersion: "unknown", // LinearClient doesn't expose version
            apiVersion: "graphql",
        };
    }
    // ========================================================================
    // EVENT TRANSPORT
    // ========================================================================
    /**
     * Create an event transport for receiving Linear webhook events.
     *
     * @param config - Transport configuration
     * @returns Linear event transport implementation
     */
    createEventTransport(config) {
        // Type narrow to Linear config
        if (config.platform !== "linear") {
            throw new Error(`Invalid platform "${config.platform}" for LinearIssueTrackerService. Expected "linear".`);
        }
        // Import from same package - no require() needed
        return new LinearEventTransport(config);
    }
}
//# sourceMappingURL=LinearIssueTrackerService.js.map