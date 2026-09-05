/**
 * Utility functions for processing GitLab webhook payloads
 */
import type { GitLabMergeRequestPayload, GitLabNotePayload, GitLabWebhookEvent } from "./types.js";
/**
 * Type guard for note payloads
 */
export declare function isNotePayload(payload: GitLabWebhookEvent["payload"]): payload is GitLabNotePayload;
/**
 * Type guard for merge_request payloads
 */
export declare function isMergeRequestPayload(payload: GitLabWebhookEvent["payload"]): payload is GitLabMergeRequestPayload;
/**
 * Check if a note webhook is for a merge request (not an issue or snippet)
 */
export declare function isNoteOnMergeRequest(event: GitLabWebhookEvent): boolean;
/**
 * Extract the MR source branch from a GitLab webhook event
 */
export declare function extractMRBranchRef(event: GitLabWebhookEvent): string | null;
/**
 * Extract the MR target (base) branch from a GitLab webhook event
 */
export declare function extractMRBaseBranchRef(event: GitLabWebhookEvent): string | null;
/**
 * Extract the MR iid (project-scoped ID) from a GitLab webhook event
 */
export declare function extractMRIid(event: GitLabWebhookEvent): number | null;
/**
 * Extract the note body from a GitLab note webhook event
 */
export declare function extractNoteBody(event: GitLabWebhookEvent): string;
/**
 * Extract the note/event author username from a GitLab webhook event
 */
export declare function extractNoteAuthor(event: GitLabWebhookEvent): string;
/**
 * Extract the note ID from a GitLab webhook event
 */
export declare function extractNoteId(event: GitLabWebhookEvent): number | null;
/**
 * Extract the discussion ID from a GitLab note webhook event
 */
export declare function extractDiscussionId(event: GitLabWebhookEvent): string | null;
/**
 * Extract project path_with_namespace (e.g., "group/project") from a GitLab webhook event
 */
export declare function extractProjectPath(event: GitLabWebhookEvent): string;
/**
 * Extract project ID from a GitLab webhook event
 */
export declare function extractProjectId(event: GitLabWebhookEvent): number;
/**
 * Extract the MR title from a GitLab webhook event
 */
export declare function extractMRTitle(event: GitLabWebhookEvent): string | null;
/**
 * Extract the MR web URL from a GitLab webhook event
 */
export declare function extractMRUrl(event: GitLabWebhookEvent): string | null;
/**
 * Extract the note URL from a GitLab note webhook event
 */
export declare function extractNoteUrl(event: GitLabWebhookEvent): string;
/**
 * Extract a unique session identifier for the GitLab webhook event.
 * Uses gitlab:path_with_namespace!iid format.
 */
export declare function extractSessionKey(event: GitLabWebhookEvent): string;
/**
 * Strip the @mention from a note body to get the actual instructions
 */
export declare function stripMention(noteBody: string, mentionHandle?: string): string;
//# sourceMappingURL=gitlab-webhook-utils.d.ts.map