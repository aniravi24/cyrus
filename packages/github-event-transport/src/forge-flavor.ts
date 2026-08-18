/**
 * The differences between GitHub and Forgejo, in one place.
 *
 * Forgejo is a Gitea fork with deliberately GitHub-shaped REST and webhooks, so
 * this transport serves both. What differs is small but not cosmetic, and each
 * entry below fails silently rather than loudly when it is wrong: a mismatched
 * event header drops every webhook as unrecognised, and a mismatched signature
 * scheme rejects every delivery as unauthorised. Keeping them in one table is
 * what makes those failures reviewable.
 */

export type Forge = "forgejo" | "github";

export interface ForgeFlavor {
	/**
	 * Authorization header value. GitHub Apps mint an installation token used as
	 * a Bearer credential; Forgejo has no App concept, so the credential is a
	 * personal access token and the scheme is `token`.
	 */
	authorization: (token: string) => string;
	/** Extra headers GitHub wants for API versioning; Forgejo ignores them. */
	extraHeaders: Record<string, string>;
	/** Webhook header naming the event type. */
	eventHeader: string;
	/**
	 * Whether the forge exposes a threaded reply route for review comments.
	 * GitHub has `/pulls/{n}/comments/{id}/replies`; Forgejo has no equivalent,
	 * so a reply there has to fall back to a PR-level comment.
	 */
	hasThreadedReviewReplies: boolean;
	/**
	 * Reactions route segment for a review comment. On Forgejo review comments
	 * live in the same table as issue comments and share their id space, so the
	 * issue route serves both; on GitHub they are distinct resources.
	 */
	reviewCommentReactionSegment: "issues" | "pulls";
	/** Webhook header carrying the HMAC signature. */
	signatureHeader: string;
	/**
	 * Expected signature value for a body. GitHub prefixes the hex digest with
	 * `sha256=`; Forgejo sends the bare digest.
	 */
	signatureValue: (digestHex: string) => string;
}

const GITHUB: ForgeFlavor = {
	authorization: (token) => `Bearer ${token}`,
	eventHeader: "x-github-event",
	extraHeaders: {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	},
	hasThreadedReviewReplies: true,
	reviewCommentReactionSegment: "pulls",
	signatureHeader: "x-hub-signature-256",
	signatureValue: (digestHex) => `sha256=${digestHex}`,
};

const FORGEJO: ForgeFlavor = {
	authorization: (token) => `token ${token}`,
	eventHeader: "x-gitea-event",
	extraHeaders: {},
	hasThreadedReviewReplies: false,
	reviewCommentReactionSegment: "issues",
	signatureHeader: "x-gitea-signature",
	signatureValue: (digestHex) => digestHex,
};

export const forgeFlavor = (forge: Forge | undefined): ForgeFlavor =>
	forge === "forgejo" ? FORGEJO : GITHUB;

/** Default API base for a forge. Forgejo is self-hosted, so it has no default. */
export const defaultApiBaseUrl = (
	forge: Forge | undefined,
): string | undefined =>
	forge === "forgejo" ? undefined : "https://api.github.com";
