/**
 * Internal Message Bus
 *
 * This module exports all types and utilities for the internal message bus
 * that provides a unified interface for handling events from multiple
 * webhook sources (Linear, GitHub, Slack, etc.).
 *
 * @module messages
 */
// Type guards
export { hasGitHubSessionStartPlatformData, hasGitHubUserPromptPlatformData, hasGitLabSessionStartPlatformData, hasGitLabUserPromptPlatformData, hasLinearSessionStartPlatformData, hasLinearUserPromptPlatformData, hasSlackSessionStartPlatformData, hasSlackUserPromptPlatformData, isContentUpdateMessage, isGitHubMessage, isGitLabMessage, isIssueStateChangeMessage, isLinearMessage, isSessionStartMessage, isSlackMessage, isStopSignalMessage, isUnassignMessage, isUserPromptMessage, } from "./type-guards.js";
//# sourceMappingURL=index.js.map