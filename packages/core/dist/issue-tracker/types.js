/**
 * Platform-agnostic types for issue tracking platforms.
 *
 * These types provide simplified interfaces that match Linear SDK GraphQL types structure.
 * Linear SDK is the source of truth - these types are designed to be compatible subsets
 * of Linear's types, omitting implementation-specific fields while maintaining core
 * data structure compatibility.
 *
 * Following the pattern from AgentEvent.ts, we reference Linear SDK types via JSDoc
 * and re-export Linear enums where they exist. This makes Linear the "source of truth"
 * while keeping interfaces manageable.
 *
 * @module issue-tracker/types
 * @see {@link https://linear.app/docs/graphql/api|Linear GraphQL API Documentation}
 */
/**
 * Standard workflow state types across platforms.
 */
export var WorkflowStateType;
(function (WorkflowStateType) {
    WorkflowStateType["Triage"] = "triage";
    WorkflowStateType["Backlog"] = "backlog";
    WorkflowStateType["Unstarted"] = "unstarted";
    WorkflowStateType["Started"] = "started";
    WorkflowStateType["Completed"] = "completed";
    WorkflowStateType["Canceled"] = "canceled";
})(WorkflowStateType || (WorkflowStateType = {}));
/**
 * Issue priority levels (0 = no priority, 1 = urgent, 2 = high, 3 = normal, 4 = low).
 */
export var IssuePriority;
(function (IssuePriority) {
    IssuePriority[IssuePriority["NoPriority"] = 0] = "NoPriority";
    IssuePriority[IssuePriority["Urgent"] = 1] = "Urgent";
    IssuePriority[IssuePriority["High"] = 2] = "High";
    IssuePriority[IssuePriority["Normal"] = 3] = "Normal";
    IssuePriority[IssuePriority["Low"] = 4] = "Low";
})(IssuePriority || (IssuePriority = {}));
/**
 * Agent session status enumeration.
 *
 * Re-exported from Linear SDK. Linear SDK is the source of truth.
 * Note: Linear uses "awaitingInput" while we historically used "awaiting-input".
 * We now use Linear's enum directly for consistency.
 *
 * @see {@link LinearSDK.AgentSessionStatus} - Linear's AgentSessionStatus enum
 */
import { AgentSessionStatus } from "@linear/sdk";
export { AgentSessionStatus };
/**
 * Agent session type/context enumeration.
 *
 * Re-exported from Linear SDK. Linear SDK is the source of truth.
 *
 * @see {@link LinearSDK.AgentSessionType} - Linear's AgentSessionType enum
 */
import { AgentSessionType } from "@linear/sdk";
export { AgentSessionType };
/**
 * Agent activity type enumeration.
 *
 * Re-exported from Linear SDK. Linear SDK is the source of truth.
 * This is aliased as AgentActivityContentType for backward compatibility.
 *
 * @see {@link LinearSDK.AgentActivityType} - Linear's AgentActivityType enum
 */
import { AgentActivityType } from "@linear/sdk";
export { AgentActivityType };
/**
 * Legacy alias for AgentActivityType.
 * @deprecated Use AgentActivityType instead
 */
export const AgentActivityContentType = AgentActivityType;
/**
 * Agent activity signal enumeration.
 *
 * Re-exported from Linear SDK. Linear SDK is the source of truth.
 *
 * @see {@link LinearSDK.AgentActivitySignal} - Linear's AgentActivitySignal enum
 */
import { AgentActivitySignal } from "@linear/sdk";
export { AgentActivitySignal };
/**
 * Type guard to check if webhook is an agent session created event.
 */
export function isAgentSessionCreatedWebhook(webhook) {
    return webhook.type === "AgentSessionEvent" && webhook.action === "created";
}
/**
 * Type guard to check if webhook is an agent session prompted event.
 */
export function isAgentSessionPromptedWebhook(webhook) {
    return webhook.type === "AgentSessionEvent" && webhook.action === "prompted";
}
/**
 * Type guard to check if webhook is an issue assigned notification.
 */
export function isIssueAssignedWebhook(webhook) {
    return (webhook.type === "AppUserNotification" &&
        webhook.action === "issueAssignedToYou");
}
/**
 * Type guard to check if webhook is an issue comment mention notification.
 */
export function isIssueCommentMentionWebhook(webhook) {
    return (webhook.type === "AppUserNotification" &&
        webhook.action === "issueCommentMention");
}
/**
 * Type guard to check if webhook is an issue new comment notification.
 */
export function isIssueNewCommentWebhook(webhook) {
    return (webhook.type === "AppUserNotification" &&
        webhook.action === "issueNewComment");
}
/**
 * Type guard to check if webhook is an issue unassigned notification.
 */
export function isIssueUnassignedWebhook(webhook) {
    return (webhook.type === "AppUserNotification" &&
        webhook.action === "issueUnassignedFromYou");
}
/**
 * Type guard to check if webhook is an issue update with title, description, or attachments changes.
 *
 * This identifies Issue entity webhooks where the `updatedFrom` field contains
 * previous values for `title`, `description`, and/or `attachments` fields, indicating these
 * fields were modified. Other field changes (like status, assignee, etc.) are ignored.
 *
 * @see https://studio.apollographql.com/public/Linear-Webhooks/variant/current/schema/reference/objects/EntityWebhookPayload
 * @see https://studio.apollographql.com/public/Linear-Webhooks/variant/current/schema/reference/objects/IssueWebhookPayload
 */
export function isIssueTitleOrDescriptionUpdateWebhook(webhook) {
    if (webhook.type !== "Issue" || webhook.action !== "update") {
        return false;
    }
    // Check if updatedFrom contains title, description, or attachments changes
    const entityWebhook = webhook;
    const updatedFrom = entityWebhook.updatedFrom;
    if (!updatedFrom) {
        return false;
    }
    // Only return true if title, description, or attachments was changed (not other fields)
    return ("title" in updatedFrom ||
        "description" in updatedFrom ||
        "attachments" in updatedFrom);
}
/**
 * Type guard to check if webhook is an issue state ID update (e.g., moved to completed/canceled).
 *
 * This identifies Issue entity webhooks where the `updatedFrom` field contains
 * a previous `stateId`, indicating the issue's workflow state was changed.
 * Used to detect when blocking issues are resolved so parked sessions can be woken up.
 */
export function isIssueStateIdUpdateWebhook(webhook) {
    if (webhook.type !== "Issue" || webhook.action !== "update") {
        return false;
    }
    const entityWebhook = webhook;
    const updatedFrom = entityWebhook.updatedFrom;
    if (!updatedFrom) {
        return false;
    }
    return "stateId" in updatedFrom;
}
/**
 * Type guard to check if webhook is an issue status change notification.
 *
 * Linear sends AppUserNotification webhooks with action "issueStatusChanged"
 * when an issue transitions to a terminal state (completed or canceled).
 */
export function isIssueStateChangeWebhook(webhook) {
    return (webhook.type === "AppUserNotification" &&
        webhook.action === "issueStatusChanged");
}
/**
 * Type guard to check if webhook is an issue deleted event.
 *
 * Linear sends Issue entity webhooks with action "remove" when an issue is deleted.
 */
export function isIssueDeletedWebhook(webhook) {
    return webhook.type === "Issue" && webhook.action === "remove";
}
//# sourceMappingURL=types.js.map