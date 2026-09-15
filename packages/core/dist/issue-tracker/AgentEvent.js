/**
 * AgentEvent type alias for webhook event payloads.
 *
 * This module provides a platform-agnostic type alias for webhook events.
 * The implementation uses Linear's webhook payload types, but this is hidden
 * from consuming code through the type alias.
 *
 * @module issue-tracker/AgentEvent
 */
/**
 * Type guard to check if an event is an issue assignment event.
 *
 * @param event - The webhook event to check
 * @returns True if the event is an issue assignment
 *
 * @example
 * ```typescript
 * if (isIssueAssignedEvent(event)) {
 *   console.log('Issue assigned:', event.notification.issue.identifier);
 * }
 * ```
 */
export function isIssueAssignedEvent(event) {
    return (event.type === "AppUserNotification" &&
        event.action === "issueAssignedToYou");
}
/**
 * Type guard to check if an event is an issue unassignment event.
 *
 * @param event - The webhook event to check
 * @returns True if the event is an issue unassignment
 *
 * @example
 * ```typescript
 * if (isIssueUnassignedEvent(event)) {
 *   console.log('Issue unassigned:', event.notification.issue.identifier);
 * }
 * ```
 */
export function isIssueUnassignedEvent(event) {
    return (event.type === "AppUserNotification" &&
        event.action === "issueUnassignedFromYou");
}
/**
 * Type guard to check if an event is a comment mention event.
 *
 * @param event - The webhook event to check
 * @returns True if the event is a comment mention
 *
 * @example
 * ```typescript
 * if (isCommentMentionEvent(event)) {
 *   console.log('Mentioned in comment:', event.notification.comment.body);
 * }
 * ```
 */
export function isCommentMentionEvent(event) {
    return (event.type === "AppUserNotification" &&
        event.action === "issueCommentMention");
}
/**
 * Type guard to check if an event is a new comment event.
 *
 * @param event - The webhook event to check
 * @returns True if the event is a new comment
 *
 * @example
 * ```typescript
 * if (isNewCommentEvent(event)) {
 *   console.log('New comment:', event.notification.comment.body);
 * }
 * ```
 */
export function isNewCommentEvent(event) {
    return (event.type === "AppUserNotification" && event.action === "issueNewComment");
}
/**
 * Type guard to check if an event is an agent session created event.
 *
 * @param event - The webhook event to check
 * @returns True if the event is an agent session creation
 *
 * @example
 * ```typescript
 * if (isAgentSessionCreatedEvent(event)) {
 *   console.log('Agent session created:', event.agentSession.id);
 * }
 * ```
 */
export function isAgentSessionCreatedEvent(event) {
    return event.type === "AgentSessionEvent" && event.action === "created";
}
/**
 * Type guard to check if an event is an agent session prompted event.
 *
 * @param event - The webhook event to check
 * @returns True if the event is an agent session prompt
 *
 * @example
 * ```typescript
 * if (isAgentSessionPromptedEvent(event)) {
 *   console.log('Agent session prompted:', event.agentActivity.content.body);
 * }
 * ```
 */
export function isAgentSessionPromptedEvent(event) {
    return event.type === "AgentSessionEvent" && event.action === "prompted";
}
//# sourceMappingURL=AgentEvent.js.map