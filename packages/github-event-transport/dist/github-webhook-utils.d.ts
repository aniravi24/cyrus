/**
 * Utility functions for processing GitHub webhook payloads
 */
import type { GitHubCommentWebhookEvent, GitHubIssueCommentPayload, GitHubPullRequestReviewCommentPayload, GitHubPullRequestReviewPayload, GitHubWebhookEvent } from "./types.js";
/**
 * Type guard for issue_comment payloads
 */
export declare function isIssueCommentPayload(payload: GitHubWebhookEvent["payload"]): payload is GitHubIssueCommentPayload;
/**
 * Type guard for pull_request_review_comment payloads
 */
export declare function isPullRequestReviewCommentPayload(payload: GitHubWebhookEvent["payload"]): payload is GitHubPullRequestReviewCommentPayload;
/**
 * Type guard for pull_request_review payloads
 */
export declare function isPullRequestReviewPayload(payload: GitHubWebhookEvent["payload"]): payload is GitHubPullRequestReviewPayload;
/**
 * Extract the PR branch name from a GitHub webhook event.
 *
 * For issue_comment: We need to use the issue.pull_request URL to determine the PR,
 * but the branch ref is not directly available in the payload. The caller must
 * fetch it from the PR API endpoint.
 *
 * For pull_request_review_comment: The branch is available in payload.pull_request.head.ref
 */
export declare function extractPRBranchRef(event: GitHubWebhookEvent): string | null;
/**
 * Extract the PR base branch name from a GitHub webhook event.
 *
 * For issue_comment: Not available in the payload; the caller must fetch it
 * from the PR API endpoint (same as extractPRBranchRef).
 *
 * For pull_request_review / pull_request_review_comment: Available via
 * payload.pull_request.base.ref
 */
export declare function extractPRBaseBranchRef(event: GitHubWebhookEvent): string | null;
/**
 * Extract the PR number from a GitHub webhook event
 */
export declare function extractPRNumber(event: GitHubWebhookEvent): number | null;
/**
 * Extract the comment body from a GitHub webhook event.
 * For pull_request_review events, returns the review body (or empty string if null).
 */
export declare function extractCommentBody(event: GitHubCommentWebhookEvent): string;
/**
 * Extract the comment author from a GitHub webhook event.
 * For pull_request_review events, returns the review author.
 */
export declare function extractCommentAuthor(event: GitHubCommentWebhookEvent): string;
/**
 * Extract repository full name (owner/repo) from a GitHub webhook event
 */
export declare function extractRepoFullName(event: GitHubWebhookEvent): string;
/**
 * Extract repository owner from a GitHub webhook event
 */
export declare function extractRepoOwner(event: GitHubWebhookEvent): string;
/**
 * Extract repository name from a GitHub webhook event
 */
export declare function extractRepoName(event: GitHubWebhookEvent): string;
/**
 * Extract the comment ID from a GitHub webhook event.
 * For pull_request_review events, returns the review ID.
 */
export declare function extractCommentId(event: GitHubCommentWebhookEvent): number;
/**
 * Extract the installation ID from a GitHub webhook event (if present)
 */
export declare function extractInstallationId(event: GitHubWebhookEvent): number | null;
/**
 * Check if an issue_comment webhook is for a pull request (not a plain issue)
 */
export declare function isCommentOnPullRequest(event: GitHubWebhookEvent): boolean;
/**
 * Extract a unique session identifier for the GitHub webhook event.
 * This is used to create a unique session for each PR + repository combination.
 */
export declare function extractSessionKey(event: GitHubWebhookEvent): string;
/**
 * Strip the @cyrusagent mention from a comment body to get the actual instructions
 */
export declare function stripMention(commentBody: string, mentionHandle?: string): string;
/**
 * Extract the PR title from a GitHub webhook event
 */
export declare function extractPRTitle(event: GitHubWebhookEvent): string | null;
/**
 * Extract the HTML URL for the comment.
 * For pull_request_review events, returns the review URL.
 */
export declare function extractCommentUrl(event: GitHubCommentWebhookEvent): string;
//# sourceMappingURL=github-webhook-utils.d.ts.map