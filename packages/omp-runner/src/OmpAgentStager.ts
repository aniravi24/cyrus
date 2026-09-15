import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Cyrus ships its subagent definitions as Claude SDK plugin directories. omp
 * deliberately skips cross-harness agent roots - `.claude/agents` and friends -
 * because their frontmatter is not the omp task-agent contract, so a dispatch by
 * `subagent_type` would fail and the caller would silently degrade to a bare
 * model at default effort.
 *
 * This translates each definition into omp's contract and writes it to omp's own
 * user agents directory, keeping one source of truth in the plugin.
 */

/**
 * Claude aliases resolve newest-first only by luck in omp's fuzzy matcher
 * (`sonnet` lands on claude-sonnet-4-0), so each alias is pinned. The second
 * entry is a cross-provider fallback: omp tries the list in order, so an
 * exhausted Anthropic account moves the pass to Codex instead of failing it.
 */
const MODEL_LISTS: Record<string, string> = {
	fable: "anthropic/claude-fable-5-1, openai-codex/gpt-5.6-sol",
	haiku: "anthropic/claude-haiku-4-5, openai-codex/gpt-5.5",
	opus: "anthropic/claude-opus-5, openai-codex/gpt-5.6-sol",
	sonnet: "anthropic/claude-sonnet-5, openai-codex/gpt-5.6-sol",
};

interface Frontmatter {
	fields: Record<string, string>;
	body: string;
}

function parseFrontmatter(source: string): Frontmatter | null {
	if (!source.startsWith("---\n")) return null;
	const end = source.indexOf("\n---", 4);
	if (end === -1) return null;
	const fields: Record<string, string> = {};
	for (const line of source.slice(4, end).split("\n")) {
		const separator = line.indexOf(":");
		if (separator === -1) continue;
		fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
	}
	return { body: source.slice(end + 4).replace(/^\n/, ""), fields };
}

/**
 * omp's user agents directory.
 *
 * Agents resolve from the *config* dir (`~/.omp/agent/agents`), not from
 * `PI_CODING_AGENT_DIR` - that override relocates credential and session state
 * only, and staging into it leaves the definitions undiscovered.
 */
export function ompAgentsDir(env: Record<string, string | undefined>): string {
	const home = env.HOME ?? homedir();
	return join(home, env.PI_CONFIG_DIR ?? ".omp", "agent", "agents");
}

/**
 * Translate every plugin agent definition into omp's contract.
 *
 * - `model: opus` becomes a pinned, prioritized selector list
 * - `effort: high` becomes omp's `thinking-level`
 * - everything else is carried through untouched
 *
 * Returns the agent names written. Missing directories are not an error: a
 * session whose config ships no plugins simply has no agents to stage.
 */
export function stageOmpAgents(
	pluginPaths: ReadonlyArray<string>,
	env: Record<string, string | undefined>,
): string[] {
	const targetDir = ompAgentsDir(env);
	const staged: string[] = [];

	for (const pluginPath of pluginPaths) {
		const sourceDir = join(pluginPath, "agents");
		let entries: string[];
		try {
			entries = readdirSync(sourceDir).filter((name) => name.endsWith(".md"));
		} catch {
			continue;
		}

		for (const entry of entries) {
			const parsed = parseFrontmatter(
				readFileSync(join(sourceDir, entry), "utf8"),
			);
			if (!parsed?.fields.name || !parsed.fields.description) continue;

			const lines = ["---", `name: ${parsed.fields.name}`];
			lines.push(`description: ${parsed.fields.description}`);
			const model = parsed.fields.model;
			if (model)
				lines.push(`model: ${MODEL_LISTS[model.toLowerCase()] ?? model}`);
			const effort = parsed.fields["thinking-level"] ?? parsed.fields.effort;
			if (effort) lines.push(`thinking-level: ${effort}`);
			for (const [key, value] of Object.entries(parsed.fields)) {
				if (
					["description", "effort", "model", "name", "thinking-level"].includes(
						key,
					)
				) {
					continue;
				}
				lines.push(`${key}: ${value}`);
			}
			lines.push("---", "", parsed.body);

			mkdirSync(targetDir, { recursive: true });
			writeFileSync(join(targetDir, entry), lines.join("\n"));
			staged.push(parsed.fields.name);
		}
	}

	return staged;
}
