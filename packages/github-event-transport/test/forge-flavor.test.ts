import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { defaultApiBaseUrl, forgeFlavor } from "../src/forge-flavor.js";

/**
 * Every difference in this table fails SILENTLY when it is wrong: a mismatched
 * event header drops webhooks as unrecognised, a mismatched signature scheme
 * rejects them as unauthorised. Neither raises anything a log would catch as an
 * error, so each one is pinned here.
 */
describe("forgeFlavor", () => {
	it("defaults to GitHub when the forge is unset", () => {
		expect(forgeFlavor(undefined)).toEqual(forgeFlavor("github"));
	});

	it("uses Bearer on GitHub and token on Forgejo", () => {
		// Forgejo has no App concept, so the credential is a PAT and the scheme
		// differs. Sending Bearer to Forgejo authenticates as nobody.
		expect(forgeFlavor("github").authorization("t")).toBe("Bearer t");
		expect(forgeFlavor("forgejo").authorization("t")).toBe("token t");
	});

	it("names the event header per forge", () => {
		expect(forgeFlavor("github").eventHeader).toBe("x-github-event");
		expect(forgeFlavor("forgejo").eventHeader).toBe("x-gitea-event");
	});

	it("names the signature header per forge", () => {
		expect(forgeFlavor("github").signatureHeader).toBe("x-hub-signature-256");
		expect(forgeFlavor("forgejo").signatureHeader).toBe("x-gitea-signature");
	});

	it("prefixes the digest on GitHub and sends it bare on Forgejo", () => {
		const digest = createHmac("sha256", "s").update("body").digest("hex");
		expect(forgeFlavor("github").signatureValue(digest)).toBe(
			`sha256=${digest}`,
		);
		expect(forgeFlavor("forgejo").signatureValue(digest)).toBe(digest);
	});

	it("routes review-comment reactions to issues on Forgejo", () => {
		// Forgejo stores review comments in the same table as issue comments and
		// shares their id space, so the issue route serves both. GitHub needs the
		// pulls route.
		expect(forgeFlavor("github").reviewCommentReactionSegment).toBe("pulls");
		expect(forgeFlavor("forgejo").reviewCommentReactionSegment).toBe("issues");
	});

	it("reports that Forgejo has no threaded review replies", () => {
		expect(forgeFlavor("github").hasThreadedReviewReplies).toBe(true);
		expect(forgeFlavor("forgejo").hasThreadedReviewReplies).toBe(false);
	});

	it("sends GitHub's API-version headers only to GitHub", () => {
		expect(forgeFlavor("github").extraHeaders).toHaveProperty(
			"X-GitHub-Api-Version",
		);
		expect(forgeFlavor("forgejo").extraHeaders).toEqual({});
	});
});

describe("defaultApiBaseUrl", () => {
	it("defaults GitHub to api.github.com", () => {
		expect(defaultApiBaseUrl("github")).toBe("https://api.github.com");
		expect(defaultApiBaseUrl(undefined)).toBe("https://api.github.com");
	});

	it("has no default for Forgejo, which is self-hosted", () => {
		// Returning a guess here would point every request at someone else's host.
		expect(defaultApiBaseUrl("forgejo")).toBeUndefined();
	});
});
