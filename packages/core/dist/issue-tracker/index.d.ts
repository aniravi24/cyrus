/**
 * Issue Tracker Abstraction Layer
 *
 * This module provides a platform-agnostic interface for issue tracking operations.
 * It decouples the Cyrus codebase from Linear-specific implementations, enabling
 * support for multiple issue tracking platforms (Linear, GitHub, Jira, etc.).
 *
 * @module issue-tracker
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { IIssueTrackerService, Issue, Comment } from '@cyrus/core/issue-tracker';
 *
 * // Use the service interface (implementation provided elsewhere)
 * async function processIssue(service: IIssueTrackerService, issueId: string) {
 *   const issue = await service.fetchIssue(issueId);
 *   const comments = await service.fetchComments(issue.id);
 *   // ... process the issue
 * }
 * ```
 *
 * @example
 * Working with webhook events:
 * ```typescript
 * import {
 *   AgentEvent,
 *   isIssueAssignedEvent,
 *   isNewCommentEvent
 * } from '@cyrus/core/issue-tracker';
 *
 * function handleWebhook(event: AgentEvent) {
 *   if (isIssueAssignedEvent(event)) {
 *     console.log('Issue assigned:', event.notification.issue.identifier);
 *   } else if (isNewCommentEvent(event)) {
 *     console.log('New comment:', event.notification.comment.body);
 *   }
 * }
 * ```
 */
export type { IIssueTrackerService } from "./IIssueTrackerService.js";
export type { AgentEventTransportConfig, AgentEventTransportEvents, IAgentEventTransport, } from "./IAgentEventTransport.js";
export type { AgentActivityCreateInput, AgentActivityPayload, } from "./types.js";
export * from "./types.js";
export type { AgentEvent } from "./AgentEvent.js";
export { isAgentSessionCreatedEvent, isAgentSessionPromptedEvent, isCommentMentionEvent, isIssueAssignedEvent, isIssueUnassignedEvent, isNewCommentEvent, } from "./AgentEvent.js";
export * from "./adapters/index.js";
/**
 * Version of the issue tracker abstraction layer.
 */
export declare const VERSION = "1.0.0";
/**
 * Supported platform types.
 */
export declare const SUPPORTED_PLATFORMS: readonly ["linear", "cli"];
/**
 * Type for supported platform identifiers.
 */
export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];
//# sourceMappingURL=index.d.ts.map