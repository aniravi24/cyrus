/**
 * Internal Message Bus
 *
 * This module exports all types and utilities for the internal message bus
 * that provides a unified interface for handling events from multiple
 * webhook sources (Linear, GitHub, Slack, etc.).
 *
 * @module messages
 */
export type { IMessageTranslator, TranslationContext, TranslationResult, } from "./IMessageTranslator.js";
export type { GitHubPlatformRef, GitLabPlatformRef, LinearPlatformRef, SlackPlatformRef, } from "./platform-refs.js";
export { hasGitHubSessionStartPlatformData, hasGitHubUserPromptPlatformData, hasGitLabSessionStartPlatformData, hasGitLabUserPromptPlatformData, hasLinearSessionStartPlatformData, hasLinearUserPromptPlatformData, hasSlackSessionStartPlatformData, hasSlackUserPromptPlatformData, isContentUpdateMessage, isGitHubMessage, isGitLabMessage, isIssueStateChangeMessage, isLinearMessage, isSessionStartMessage, isSlackMessage, isStopSignalMessage, isUnassignMessage, isUserPromptMessage, } from "./type-guards.js";
export type { ContentChanges, ContentUpdateMessage, GitHubSessionStartPlatformData, GitHubUserPromptPlatformData, GitLabSessionStartPlatformData, GitLabUserPromptPlatformData, GuidanceItem, InternalMessage, InternalMessageBase, IssueStateChangeMessage, LinearContentUpdatePlatformData, LinearIssueStateChangePlatformData, LinearSessionStartPlatformData, LinearStopSignalPlatformData, LinearUnassignPlatformData, LinearUserPromptPlatformData, MessageAction, MessageAuthor, MessageSource, SessionStartMessage, SlackSessionStartPlatformData, SlackUserPromptPlatformData, StopSignalMessage, UnassignMessage, UserPromptMessage, } from "./types.js";
//# sourceMappingURL=index.d.ts.map