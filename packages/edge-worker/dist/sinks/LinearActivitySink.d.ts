import { type AgentActivityContent, type IIssueTrackerService } from "cyrus-core";
import type { ActivityPostOptions, ActivityPostResult, IActivitySink } from "./IActivitySink.js";
/**
 * Linear-specific implementation of IActivitySink.
 *
 * LinearActivitySink wraps an IIssueTrackerService instance to provide activity
 * sink functionality for Linear workspaces. It delegates activity posting and
 * session creation to the underlying issue tracker service.
 *
 * @example
 * ```typescript
 * const issueTracker = new LinearIssueTrackerService(linearClient, {
 *   workspaceId: 'workspace-123',
 *   // ... other OAuth config
 * });
 *
 * const sink = new LinearActivitySink(issueTracker, 'workspace-123');
 *
 * // Create a session
 * const sessionId = await sink.createAgentSession('issue-id-456');
 *
 * // Post activities
 * const result = await sink.postActivity(sessionId, {
 *   type: 'thought',
 *   body: 'Analyzing the issue...'
 * });
 * ```
 */
export declare class LinearActivitySink implements IActivitySink {
    /**
     * Unique identifier for this sink (Linear workspace ID).
     */
    readonly id: string;
    private readonly issueTracker;
    /**
     * Create a new LinearActivitySink.
     *
     * @param issueTracker - The IIssueTrackerService instance to delegate to
     * @param workspaceId - The Linear workspace ID (used as sink ID)
     */
    constructor(issueTracker: IIssueTrackerService, workspaceId: string);
    /**
     * Map a platform-agnostic ActivitySignal string to Linear's AgentActivitySignal enum.
     */
    private mapSignal;
    /**
     * Post an activity to an existing agent session.
     *
     * Wraps IIssueTrackerService.createAgentActivity() to provide a simplified
     * interface for activity posting.
     *
     * @param sessionId - The agent session ID to post to
     * @param activity - The activity content (thought, action, response, error, etc.)
     * @param options - Optional settings for ephemeral, signal, signalMetadata
     * @returns Promise that resolves with the activity post result
     */
    postActivity(sessionId: string, activity: AgentActivityContent, options?: ActivityPostOptions): Promise<ActivityPostResult>;
    /**
     * Create a new agent session on an issue.
     *
     * Wraps IIssueTrackerService.createAgentSessionOnIssue() to provide a simplified
     * interface for session creation.
     *
     * @param issueId - The issue ID to attach the session to
     * @returns Promise that resolves with the created session ID
     */
    createAgentSession(issueId: string): Promise<string>;
}
//# sourceMappingURL=LinearActivitySink.d.ts.map