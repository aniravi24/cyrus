/**
 * Service for posting comments back to GitHub PR conversations.
 *
 * Uses the GitHub REST API with an installation access token
 * to post replies on PR issue comments and PR review comments.
 */
export interface GitHubCommentServiceConfig {
    /** GitHub API base URL (default: https://api.github.com) */
    apiBaseUrl?: string;
}
/**
 * Parameters for posting a reply to a GitHub PR comment
 */
export interface PostCommentParams {
    /** GitHub installation access token */
    token: string;
    /** Repository owner */
    owner: string;
    /** Repository name */
    repo: string;
    /** PR/Issue number */
    issueNumber: number;
    /** Comment body (markdown) */
    body: string;
}
/**
 * Parameters for posting a reply to a PR review comment
 */
export interface PostReviewCommentReplyParams {
    /** GitHub installation access token */
    token: string;
    /** Repository owner */
    owner: string;
    /** Repository name */
    repo: string;
    /** Pull request number */
    pullNumber: number;
    /** The ID of the review comment to reply to */
    commentId: number;
    /** Reply body (markdown) */
    body: string;
}
/**
 * Response from GitHub API after creating a comment
 */
export interface GitHubCommentResponse {
    id: number;
    html_url: string;
    body: string;
}
/**
 * Parameters for adding a reaction to a GitHub comment
 */
export interface AddReactionParams {
    /** GitHub installation access token */
    token: string;
    /** Repository owner */
    owner: string;
    /** Repository name */
    repo: string;
    /** The ID of the comment to react to */
    commentId: number;
    /** Whether this is a PR review comment (vs an issue comment) */
    isPullRequestReviewComment: boolean;
    /** Reaction content (e.g. "eyes", "+1", "heart") */
    content: string;
}
export declare class GitHubCommentService {
    private apiBaseUrl;
    constructor(config?: GitHubCommentServiceConfig);
    /**
     * Post a comment on a PR/Issue (top-level comment).
     * Used for replying to issue_comment webhooks.
     *
     * @see https://docs.github.com/en/rest/issues/comments#create-an-issue-comment
     */
    postIssueComment(params: PostCommentParams): Promise<GitHubCommentResponse>;
    /**
     * Post a reply to a PR review comment (inline reply).
     * Used for replying to pull_request_review_comment webhooks.
     *
     * @see https://docs.github.com/en/rest/pulls/comments#create-a-reply-for-a-review-comment
     */
    postReviewCommentReply(params: PostReviewCommentReplyParams): Promise<GitHubCommentResponse>;
    /**
     * Add a reaction to a comment.
     *
     * @see https://docs.github.com/en/rest/reactions/reactions#create-reaction-for-an-issue-comment
     * @see https://docs.github.com/en/rest/reactions/reactions#create-reaction-for-a-pull-request-review-comment
     */
    addReaction(params: AddReactionParams): Promise<void>;
}
//# sourceMappingURL=GitHubCommentService.d.ts.map