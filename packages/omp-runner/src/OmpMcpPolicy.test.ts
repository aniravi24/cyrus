import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMcpPolicy } from "./OmpMcpPolicy.js";

/** A checkout whose `.mcp.json` defines the servers omp would discover. */
function repoWith(servers: string[]): string {
	const root = mkdtempSync(join(tmpdir(), "omp-mcp-"));
	mkdirSync(root, { recursive: true });
	writeFileSync(
		join(root, ".mcp.json"),
		JSON.stringify({
			mcpServers: Object.fromEntries(
				servers.map((s) => [s, { type: "stdio" }]),
			),
		}),
	);
	return root;
}

const REPO_SERVERS = [
	"airtable",
	"codanna",
	"gplpmatch-admin-prod",
	"linear-server",
	"posthog",
	"sentry",
	"storybook",
	"stripe",
	"superhuman-mail",
	"warehouse-prod",
];

describe("resolveMcpPolicy", () => {
	it("denies every server the allowlist does not name", () => {
		// The allowlist is Cyrus's own `allowedTools`, so the omp session reaches
		// exactly what the Claude runner reaches - not every server in the repo.
		const policy = resolveMcpPolicy(
			[
				"Read(**)",
				"mcp__codanna",
				"mcp__sentry",
				"mcp__storybook",
				"mcp__warehouse-prod",
				"mcp__airtable__list_records",
			],
			repoWith(REPO_SERVERS),
		);

		expect(policy.disabledServers).toEqual([
			"gplpmatch-admin-prod",
			"linear-server",
			"posthog",
			"stripe",
			"superhuman-mail",
		]);
	});

	it("admits a partially-allowed server but denies its write tools", () => {
		const policy = resolveMcpPolicy(
			["mcp__airtable__list_records", "mcp__airtable__get_record"],
			repoWith(["airtable", "stripe"]),
		);

		expect(policy.disabledServers).toEqual(["stripe"]);
		expect(policy.deniedTools).toContain("mcp__airtable_create_record");
		expect(policy.deniedTools).toContain("mcp__airtable_delete_records");
		expect(policy.deniedTools).toContain("mcp__airtable_upload_attachment");
		// Read tools stay reachable.
		expect(policy.deniedTools).not.toContain("mcp__airtable_list_records");
	});

	it("denies nothing when the session carries no allowlist", () => {
		// A session with no allowlist is the pre-existing Cyrus behavior for other
		// runners; narrowing it here would silently break them.
		const policy = resolveMcpPolicy(undefined, repoWith(REPO_SERVERS));

		expect(policy.disabledServers).toEqual([]);
		expect(policy.deniedTools).toEqual([]);
	});

	it("ignores a malformed project MCP file instead of failing the session", () => {
		const root = mkdtempSync(join(tmpdir(), "omp-mcp-bad-"));
		writeFileSync(join(root, ".mcp.json"), "{ not json");

		expect(resolveMcpPolicy(["mcp__codanna"], root).disabledServers).toEqual(
			[],
		);
	});
});
