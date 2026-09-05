/**
 * Service for posting comments back to GitHub PR conversations.
 *
 * Uses the GitHub REST API with an installation access token
 * to post replies on PR issue comments and PR review comments.
 */
export class GitHubCommentService {
    apiBaseUrl;
    constructor(config) {
        this.apiBaseUrl = config?.apiBaseUrl ?? "https://api.github.com";
    }
    /**
     * Post a comment on a PR/Issue (top-level comment).
     * Used for replying to issue_comment webhooks.
     *
     * @see https://docs.github.com/en/rest/issues/comments#create-an-issue-comment
     */
    async postIssueComment(params) {
        const { token, owner, repo, issueNumber, body } = params;
        const url = `${this.apiBaseUrl}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({ body }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[GitHubCommentService] Failed to post issue comment: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return (await response.json());
    }
    /**
     * Post a reply to a PR review comment (inline reply).
     * Used for replying to pull_request_review_comment webhooks.
     *
     * @see https://docs.github.com/en/rest/pulls/comments#create-a-reply-for-a-review-comment
     */
    async postReviewCommentReply(params) {
        const { token, owner, repo, pullNumber, commentId, body } = params;
        const url = `${this.apiBaseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/comments/${commentId}/replies`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({ body }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[GitHubCommentService] Failed to post review comment reply: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return (await response.json());
    }
    /**
     * Add a reaction to a comment.
     *
     * @see https://docs.github.com/en/rest/reactions/reactions#create-reaction-for-an-issue-comment
     * @see https://docs.github.com/en/rest/reactions/reactions#create-reaction-for-a-pull-request-review-comment
     */
    async addReaction(params) {
        const { token, owner, repo, commentId, isPullRequestReviewComment, content, } = params;
        const segment = isPullRequestReviewComment ? "pulls" : "issues";
        const url = `${this.apiBaseUrl}/repos/${owner}/${repo}/${segment}/comments/${commentId}/reactions`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({ content }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[GitHubCommentService] Failed to add reaction: ${response.status} ${response.statusText} - ${errorBody}`);
        }
    }
}
//# sourceMappingURL=GitHubCommentService.js.map