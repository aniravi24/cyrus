import { type Forge, forgeFlavor } from "./forge-flavor.js";

/**
 * Service for posting comments back to PR conversations.
 *
 * Uses the forge's REST API with an installation access token (GitHub) or a
 * personal access token (Forgejo) to post replies on PR issue comments and PR
 * review comments.
 */

export interface GitHubCommentServiceConfig {
	/** API base URL (default: https://api.github.com; required for Forgejo) */
	apiBaseUrl?: string;
	/** Which forge this instance talks to. Defaults to GitHub. */
	forge?: Forge;
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

export class GitHubCommentService {
	private apiBaseUrl: string;
	private flavor: ReturnType<typeof forgeFlavor>;

	constructor(config?: GitHubCommentServiceConfig) {
		this.apiBaseUrl = config?.apiBaseUrl ?? "https://api.github.com";
		this.flavor = forgeFlavor(config?.forge);
	}

	/**
	 * Post a comment on a PR/Issue (top-level comment).
	 * Used for replying to issue_comment webhooks.
	 *
	 * @see https://docs.github.com/en/rest/issues/comments#create-an-issue-comment
	 */
	async postIssueComment(
		params: PostCommentParams,
	): Promise<GitHubCommentResponse> {
		const { token, owner, repo, issueNumber, body } = params;
		const url = `${this.apiBaseUrl}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: this.flavor.authorization(token),
				"Content-Type": "application/json",
				...this.flavor.extraHeaders,
			},
			body: JSON.stringify({ body }),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(
				`[GitHubCommentService] Failed to post issue comment: ${response.status} ${response.statusText} - ${errorBody}`,
			);
		}

		return (await response.json()) as GitHubCommentResponse;
	}

	/**
	 * Post a reply to a PR review comment (inline reply).
	 * Used for replying to pull_request_review_comment webhooks.
	 *
	 * @see https://docs.github.com/en/rest/pulls/comments#create-a-reply-for-a-review-comment
	 */
	async postReviewCommentReply(
		params: PostReviewCommentReplyParams,
	): Promise<GitHubCommentResponse> {
		const { token, owner, repo, pullNumber, commentId, body } = params;

		// Forgejo has no threaded-reply route for review comments. Falling back
		// to a PR-level comment keeps the reply visible instead of dropping it,
		// but it does NOT land in the thread - so it carries a pointer back to
		// the comment it answers, otherwise the reply reads as unrelated.
		if (!this.flavor.hasThreadedReviewReplies) {
			return this.postIssueComment({
				body: `> Replying to review comment [#${commentId}](${this.apiBaseUrl.replace(/\/api\/v1$/, "")}/${owner}/${repo}/pulls/${pullNumber}#issuecomment-${commentId})\n\n${body}`,
				issueNumber: pullNumber,
				owner,
				repo,
				token,
			});
		}

		const url = `${this.apiBaseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/comments/${commentId}/replies`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: this.flavor.authorization(token),
				"Content-Type": "application/json",
				...this.flavor.extraHeaders,
			},
			body: JSON.stringify({ body }),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(
				`[GitHubCommentService] Failed to post review comment reply: ${response.status} ${response.statusText} - ${errorBody}`,
			);
		}

		return (await response.json()) as GitHubCommentResponse;
	}

	/**
	 * Add a reaction to a comment.
	 *
	 * @see https://docs.github.com/en/rest/reactions/reactions#create-reaction-for-an-issue-comment
	 * @see https://docs.github.com/en/rest/reactions/reactions#create-reaction-for-a-pull-request-review-comment
	 */
	async addReaction(params: AddReactionParams): Promise<void> {
		const {
			token,
			owner,
			repo,
			commentId,
			isPullRequestReviewComment,
			content,
		} = params;

		const segment = isPullRequestReviewComment
			? this.flavor.reviewCommentReactionSegment
			: "issues";
		const url = `${this.apiBaseUrl}/repos/${owner}/${repo}/${segment}/comments/${commentId}/reactions`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: this.flavor.authorization(token),
				"Content-Type": "application/json",
				...this.flavor.extraHeaders,
			},
			body: JSON.stringify({ content }),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(
				`[GitHubCommentService] Failed to add reaction: ${response.status} ${response.statusText} - ${errorBody}`,
			);
		}
	}
}
