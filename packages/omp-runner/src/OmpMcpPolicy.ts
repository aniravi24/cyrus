import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * omp discovers MCP servers from the repository, so a session would reach every
 * server the repo defines. Cyrus's `allowedTools` is the allowlist the Claude
 * runner already enforces; this derives omp's denylist from that same list so
 * one source of truth governs both harnesses.
 */

/** Files omp reads MCP servers from, relative to the session cwd. */
const PROJECT_MCP_FILES = [
	".omp/mcp.json",
	".omp/.mcp.json",
	"mcp.json",
	".mcp.json",
];

/**
 * Write tools on servers the allowlist admits read-only. omp's approval config
 * takes exact tool names, so a partially-allowed server needs its mutating
 * tools named; policy, not derivable from the allowlist.
 */
const WRITE_TOOLS_BY_SERVER: Record<string, ReadonlyArray<string>> = {
	airtable: [
		"create_comment",
		"create_field",
		"create_record",
		"create_table",
		"delete_records",
		"update_field",
		"update_records",
		"update_table",
		"upload_attachment",
	],
};

export interface OmpMcpPolicy {
	/** Servers omp must not load, highest-precedence denylist. */
	disabledServers: string[];
	/** Exact tool names to deny on servers admitted read-only. */
	deniedTools: string[];
}

function serversDefinedIn(cwd: string): string[] {
	const found = new Set<string>();
	for (const relative of PROJECT_MCP_FILES) {
		const path = join(cwd, relative);
		if (!existsSync(path)) continue;
		try {
			const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
			if (!parsed || typeof parsed !== "object" || !("mcpServers" in parsed)) {
				continue;
			}
			const servers = parsed.mcpServers;
			if (!servers || typeof servers !== "object") continue;
			for (const name of Object.keys(servers))
				found.add(name.split(":")[0] ?? name);
		} catch {
			// A malformed project MCP file is not this runner's to repair, and
			// failing closed here would take down the session instead.
		}
	}
	return [...found];
}

/**
 * Reads `mcp__<server>` and `mcp__<server>__<tool>` entries out of the
 * allowlist. A bare server entry admits the whole server; tool entries admit it
 * read-only, so its write tools are denied by name.
 */
export function resolveMcpPolicy(
	allowedTools: ReadonlyArray<string> | undefined,
	cwd: string,
): OmpMcpPolicy {
	const discovered = serversDefinedIn(cwd);
	if (!allowedTools) return { deniedTools: [], disabledServers: [] };

	const wholeServers = new Set<string>();
	const partialServers = new Set<string>();
	for (const entry of allowedTools) {
		if (!entry.startsWith("mcp__")) continue;
		const [server, tool] = entry.slice("mcp__".length).split("__");
		if (!server) continue;
		if (tool) partialServers.add(server);
		else wholeServers.add(server);
	}

	const disabledServers = discovered
		.filter((name) => !wholeServers.has(name) && !partialServers.has(name))
		.sort();

	const deniedTools: string[] = [];
	for (const server of partialServers) {
		// omp names an MCP tool `mcp__<server>_<tool>`, single underscore.
		for (const tool of WRITE_TOOLS_BY_SERVER[server] ?? []) {
			deniedTools.push(`mcp__${server}_${tool}`);
		}
	}

	return { deniedTools: deniedTools.sort(), disabledServers };
}
