import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GitHubEventTransport } from "../src/GitHubEventTransport.js";
import type { GitHubEventTransportConfig } from "../src/types.js";
import { issueCommentPayload } from "./fixtures.js";

/**
 * End-to-end behaviour of the Forgejo flavor through the real handler.
 *
 * `forge-flavor.test.ts` pins the table; this proves the transport actually
 * reads it. Both matter: a correct table wired to the wrong call site fails
 * exactly as silently as a wrong table.
 */
function createMockFastify() {
	const routes: Record<
		string,
		(request: unknown, reply: unknown) => Promise<void>
	> = {};
	return {
		post: vi.fn((path: string, ...args: unknown[]) => {
			const handler =
				args.length === 1
					? (args[0] as (request: unknown, reply: unknown) => Promise<void>)
					: (args[1] as (request: unknown, reply: unknown) => Promise<void>);
			routes[path] = handler;
		}),
		routes,
	};
}

function createMockRequest(
	body: unknown,
	headers: Record<string, string> = {},
) {
	return { body, headers, ip: "127.0.0.1", rawBody: JSON.stringify(body) };
}

function createMockReply() {
	return { code: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() };
}

const testSecret = "forgejo-secret";

describe("GitHubEventTransport with forge: forgejo", () => {
	let mockFastify: ReturnType<typeof createMockFastify>;
	let transport: GitHubEventTransport;

	beforeEach(() => {
		mockFastify = createMockFastify();
		const config: GitHubEventTransportConfig = {
			fastifyServer:
				mockFastify as unknown as GitHubEventTransportConfig["fastifyServer"],
			forge: "forgejo",
			routePath: "/forgejo-webhook",
			secret: testSecret,
			verificationMode: "signature",
		};
		transport = new GitHubEventTransport(config);
		transport.register();
	});

	it("mounts on the configured route, not /github-webhook", () => {
		// Both transports run in one process; sharing a route would mean the
		// second registration silently shadows the first.
		expect(mockFastify.routes["/forgejo-webhook"]).toBeDefined();
		expect(mockFastify.routes["/github-webhook"]).toBeUndefined();
	});

	it("accepts a bare (unprefixed) HMAC digest in x-gitea-signature", async () => {
		const listener = vi.fn();
		transport.on("event", listener);

		const request = createMockRequest(issueCommentPayload, {
			"x-gitea-delivery": "delivery-1",
			"x-gitea-event": "issue_comment",
		});
		request.headers["x-gitea-signature"] = createHmac("sha256", testSecret)
			.update(request.rawBody)
			.digest("hex");
		const reply = createMockReply();

		await mockFastify.routes["/forgejo-webhook"]!(request, reply);

		expect(reply.code).toHaveBeenCalledWith(200);
		expect(listener).toHaveBeenCalled();
	});

	it("rejects a GitHub-style sha256= prefixed digest", async () => {
		// The prefix is what distinguishes the two schemes. Accepting both would
		// mean the length check guarding timingSafeEqual no longer holds.
		const request = createMockRequest(issueCommentPayload, {
			"x-gitea-event": "issue_comment",
		});
		request.headers["x-gitea-signature"] = `sha256=${createHmac(
			"sha256",
			testSecret,
		)
			.update(request.rawBody)
			.digest("hex")}`;
		const reply = createMockReply();

		await mockFastify.routes["/forgejo-webhook"]!(request, reply);

		expect(reply.code).toHaveBeenCalledWith(401);
	});

	it("rejects a delivery signed with the wrong secret", async () => {
		const request = createMockRequest(issueCommentPayload, {
			"x-gitea-event": "issue_comment",
		});
		request.headers["x-gitea-signature"] = createHmac("sha256", "wrong")
			.update(request.rawBody)
			.digest("hex");
		const reply = createMockReply();

		await mockFastify.routes["/forgejo-webhook"]!(request, reply);

		expect(reply.code).toHaveBeenCalledWith(401);
	});

	it("names the Forgejo header when the signature is missing", async () => {
		const request = createMockRequest(issueCommentPayload, {
			"x-gitea-event": "issue_comment",
		});
		const reply = createMockReply();

		await mockFastify.routes["/forgejo-webhook"]!(request, reply);

		expect(reply.code).toHaveBeenCalledWith(401);
		expect(reply.send).toHaveBeenCalledWith({
			error: "Missing x-gitea-signature header",
		});
	});

	it("ignores x-github-event, so a misrouted delivery fails loudly", async () => {
		// A GitHub delivery landing here must not be processed as if it were
		// Forgejo's - it would be attributed to the wrong forge's repo config.
		const request = createMockRequest(issueCommentPayload, {
			"x-github-event": "issue_comment",
		});
		request.headers["x-gitea-signature"] = createHmac("sha256", testSecret)
			.update(request.rawBody)
			.digest("hex");
		const reply = createMockReply();

		await mockFastify.routes["/forgejo-webhook"]!(request, reply);

		expect(reply.code).toHaveBeenCalledWith(400);
		expect(reply.send).toHaveBeenCalledWith({
			error: "Missing x-gitea-event header",
		});
	});
});
