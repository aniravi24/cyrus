/**
 * Type Guards for Internal Messages
 *
 * This module provides type guard functions for discriminating between
 * different internal message types based on the `action` field.
 *
 * @module messages/type-guards
 */
import type { ContentUpdateMessage, GitHubSessionStartPlatformData, GitHubUserPromptPlatformData, GitLabSessionStartPlatformData, GitLabUserPromptPlatformData, InternalMessage, IssueStateChangeMessage, LinearSessionStartPlatformData, LinearUserPromptPlatformData, SessionStartMessage, SlackSessionStartPlatformData, SlackUserPromptPlatformData, StopSignalMessage, UnassignMessage, UserPromptMessage } from "./types.js";
/**
 * Type guard for SessionStartMessage.
 */
export declare function isSessionStartMessage(message: InternalMessage): message is SessionStartMessage;
/**
 * Type guard for UserPromptMessage.
 */
export declare function isUserPromptMessage(message: InternalMessage): message is UserPromptMessage;
/**
 * Type guard for StopSignalMessage.
 */
export declare function isStopSignalMessage(message: InternalMessage): message is StopSignalMessage;
/**
 * Type guard for ContentUpdateMessage.
 */
export declare function isContentUpdateMessage(message: InternalMessage): message is ContentUpdateMessage;
/**
 * Type guard for UnassignMessage.
 */
export declare function isUnassignMessage(message: InternalMessage): message is UnassignMessage;
/**
 * Type guard for IssueStateChangeMessage.
 */
export declare function isIssueStateChangeMessage(message: InternalMessage): message is IssueStateChangeMessage;
/**
 * Type guard to check if message is from Linear.
 */
export declare function isLinearMessage(message: InternalMessage): boolean;
/**
 * Type guard to check if message is from GitHub.
 */
export declare function isGitHubMessage(message: InternalMessage): boolean;
/**
 * Type guard to check if message is from GitLab.
 */
export declare function isGitLabMessage(message: InternalMessage): boolean;
/**
 * Type guard to check if message is from Slack.
 */
export declare function isSlackMessage(message: InternalMessage): boolean;
/**
 * Type guard for Linear platform data in SessionStartMessage.
 */
export declare function hasLinearSessionStartPlatformData(message: SessionStartMessage): message is SessionStartMessage & {
    platformData: LinearSessionStartPlatformData;
};
/**
 * Type guard for GitHub platform data in SessionStartMessage.
 */
export declare function hasGitHubSessionStartPlatformData(message: SessionStartMessage): message is SessionStartMessage & {
    platformData: GitHubSessionStartPlatformData;
};
/**
 * Type guard for Linear platform data in UserPromptMessage.
 */
export declare function hasLinearUserPromptPlatformData(message: UserPromptMessage): message is UserPromptMessage & {
    platformData: LinearUserPromptPlatformData;
};
/**
 * Type guard for GitHub platform data in UserPromptMessage.
 */
export declare function hasGitHubUserPromptPlatformData(message: UserPromptMessage): message is UserPromptMessage & {
    platformData: GitHubUserPromptPlatformData;
};
/**
 * Type guard for GitLab platform data in SessionStartMessage.
 */
export declare function hasGitLabSessionStartPlatformData(message: SessionStartMessage): message is SessionStartMessage & {
    platformData: GitLabSessionStartPlatformData;
};
/**
 * Type guard for GitLab platform data in UserPromptMessage.
 */
export declare function hasGitLabUserPromptPlatformData(message: UserPromptMessage): message is UserPromptMessage & {
    platformData: GitLabUserPromptPlatformData;
};
/**
 * Type guard for Slack platform data in SessionStartMessage.
 */
export declare function hasSlackSessionStartPlatformData(message: SessionStartMessage): message is SessionStartMessage & {
    platformData: SlackSessionStartPlatformData;
};
/**
 * Type guard for Slack platform data in UserPromptMessage.
 */
export declare function hasSlackUserPromptPlatformData(message: UserPromptMessage): message is UserPromptMessage & {
    platformData: SlackUserPromptPlatformData;
};
//# sourceMappingURL=type-guards.d.ts.map