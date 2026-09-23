/**
 * Type Guards for Internal Messages
 *
 * This module provides type guard functions for discriminating between
 * different internal message types based on the `action` field.
 *
 * @module messages/type-guards
 */
// ============================================================================
// MESSAGE TYPE GUARDS
// ============================================================================
/**
 * Type guard for SessionStartMessage.
 */
export function isSessionStartMessage(message) {
    return message.action === "session_start";
}
/**
 * Type guard for UserPromptMessage.
 */
export function isUserPromptMessage(message) {
    return message.action === "user_prompt";
}
/**
 * Type guard for StopSignalMessage.
 */
export function isStopSignalMessage(message) {
    return message.action === "stop_signal";
}
/**
 * Type guard for ContentUpdateMessage.
 */
export function isContentUpdateMessage(message) {
    return message.action === "content_update";
}
/**
 * Type guard for UnassignMessage.
 */
export function isUnassignMessage(message) {
    return message.action === "unassign";
}
/**
 * Type guard for IssueStateChangeMessage.
 */
export function isIssueStateChangeMessage(message) {
    return message.action === "issue_state_change";
}
// ============================================================================
// SOURCE-SPECIFIC TYPE GUARDS
// ============================================================================
/**
 * Type guard to check if message is from Linear.
 */
export function isLinearMessage(message) {
    return message.source === "linear";
}
/**
 * Type guard to check if message is from GitHub.
 */
export function isGitHubMessage(message) {
    return message.source === "github";
}
/**
 * Type guard to check if message is from GitLab.
 */
export function isGitLabMessage(message) {
    return message.source === "gitlab";
}
/**
 * Type guard to check if message is from Slack.
 */
export function isSlackMessage(message) {
    return message.source === "slack";
}
// ============================================================================
// PLATFORM DATA TYPE GUARDS
// ============================================================================
/**
 * Type guard for Linear platform data in SessionStartMessage.
 */
export function hasLinearSessionStartPlatformData(message) {
    return message.source === "linear";
}
/**
 * Type guard for GitHub platform data in SessionStartMessage.
 */
export function hasGitHubSessionStartPlatformData(message) {
    return message.source === "github";
}
/**
 * Type guard for Linear platform data in UserPromptMessage.
 */
export function hasLinearUserPromptPlatformData(message) {
    return message.source === "linear";
}
/**
 * Type guard for GitHub platform data in UserPromptMessage.
 */
export function hasGitHubUserPromptPlatformData(message) {
    return message.source === "github";
}
/**
 * Type guard for GitLab platform data in SessionStartMessage.
 */
export function hasGitLabSessionStartPlatformData(message) {
    return message.source === "gitlab";
}
/**
 * Type guard for GitLab platform data in UserPromptMessage.
 */
export function hasGitLabUserPromptPlatformData(message) {
    return message.source === "gitlab";
}
/**
 * Type guard for Slack platform data in SessionStartMessage.
 */
export function hasSlackSessionStartPlatformData(message) {
    return message.source === "slack";
}
/**
 * Type guard for Slack platform data in UserPromptMessage.
 */
export function hasSlackUserPromptPlatformData(message) {
    return message.source === "slack";
}
//# sourceMappingURL=type-guards.js.map