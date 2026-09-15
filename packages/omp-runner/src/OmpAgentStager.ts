import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Translates Cyrus's plugin subagent definitions into omp's task-agent contract.
 * omp skips cross-harness agent roots (`.claude/agents`), so without this a
 * `subagent_type` dispatch fails and the pass drops to a bare default model.
 */

/**
 * Aliases pinned because omp's fuzzy matcher is not newest-first (`sonnet` lands
 * on claude-sonnet-4-0). Second entry is the cross-provider fallback omp tries
 * next. A definition needing another model sets `omp-model` and wins verbatim.
 */
const OMP_FALLBACK_MODEL = "openai-codex/gpt-5.6-sol";

const MODEL_LISTS: Record<string, string> = {
	fable: `anthropic/claude-fable-5-1, ${OMP_FALLBACK_MODEL}`,
	haiku: `anthropic/claude-haiku-4-5, ${OMP_FALLBACK_MODEL}`,
	opus: `anthropic/claude-opus-5, ${OMP_FALLBACK_MODEL}`,
	sonnet: `anthropic/claude-sonnet-5, ${OMP_FALLBACK_MODEL}`,
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

/** Agents resolve from the config dir, not PI_CODING_AGENT_DIR (that moves credential/session state). */
export function ompAgentsDir(env: Record<string, string | undefined>): string {
	const home = env.HOME ?? homedir();
	return join(home, env.PI_CONFIG_DIR ?? ".omp", "agent", "agents");
}

/**
 * `model: opus` becomes a pinned selector list, `effort` becomes `thinking-level`,
 * everything else carries through. Returns the names written; a missing directory
 * is not an error.
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
			// `omp-model` lets a definition state its own omp selector list, which
			// is how one pass opts into a model the default mapping deliberately
			// does not reach for. Claude ignores the unknown key.
			const override = parsed.fields["omp-model"];
			const model = override ?? parsed.fields.model;
			const selector = override
				? override
				: model
					? (MODEL_LISTS[model.toLowerCase()] ?? model)
					: undefined;
			if (selector) lines.push(`model: ${selector}`);
			const effort = parsed.fields["thinking-level"] ?? parsed.fields.effort;
			if (effort) lines.push(`thinking-level: ${effort}`);
			for (const [key, value] of Object.entries(parsed.fields)) {
				if (
					[
						"description",
						"effort",
						"model",
						"name",
						"omp-model",
						"thinking-level",
					].includes(key)
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
