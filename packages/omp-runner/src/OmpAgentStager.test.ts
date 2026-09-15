import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ompAgentsDir, stageOmpAgents } from "./OmpAgentStager.js";

function pluginWithAgent(
	frontmatter: string,
	body = "Do the review pass.",
): string {
	const root = mkdtempSync(join(tmpdir(), "omp-plugin-"));
	mkdirSync(join(root, "agents"), { recursive: true });
	const name = /name:\s*(\S+)/.exec(frontmatter)?.[1] ?? "agent";
	writeFileSync(
		join(root, "agents", `${name}.md`),
		`---\n${frontmatter}\n---\n\n${body}\n`,
	);
	return root;
}

describe("stageOmpAgents", () => {
	it("pins a Claude alias to a prioritized list and maps effort to thinking-level", () => {
		const plugin = pluginWithAgent(
			"name: review-rules\ndescription: Rules-check pass.\nmodel: opus\neffort: high",
		);
		const agentDir = mkdtempSync(join(tmpdir(), "omp-agentdir-"));

		const staged = stageOmpAgents([plugin], { HOME: agentDir });

		expect(staged).toEqual(["review-rules"]);
		const written = readFileSync(
			join(agentDir, ".omp", "agent", "agents", "review-rules.md"),
			"utf8",
		);
		// `opus` must not be left to omp's fuzzy matcher, and the second entry is
		// what keeps the pass running when the Anthropic window is exhausted.
		expect(written).toContain(
			"model: anthropic/claude-opus-5, openai-codex/gpt-5.6-sol",
		);
		// omp reads `thinking-level`; a carried-over `effort` key would be ignored
		// and the pass would silently run at the default level.
		expect(written).toContain("thinking-level: high");
		expect(written).not.toContain("effort: high");
		expect(written).toContain("Do the review pass.");
	});

	it("takes an omp-model override verbatim so one pass can escalate", () => {
		// The C3.2 adversarial pass is the only place a frontier model is worth
		// its cost; the default mapping must not reach for it everywhere else.
		const plugin = pluginWithAgent(
			"name: review-break\ndescription: Break the diff.\nmodel: fable\nomp-model: anthropic/claude-fable-5-1, openai-codex/gpt-6-astra\neffort: high",
		);
		const agentDir = mkdtempSync(join(tmpdir(), "omp-agentdir-"));

		stageOmpAgents([plugin], { HOME: agentDir });

		const written = readFileSync(
			join(agentDir, ".omp", "agent", "agents", "review-break.md"),
			"utf8",
		);
		expect(written).toContain(
			"model: anthropic/claude-fable-5-1, openai-codex/gpt-6-astra",
		);
		// The alias must not also appear, or omp would see two model lines.
		expect(written).not.toContain("model: fable");
		expect(written).not.toContain("omp-model:");
		expect(written).toContain("thinking-level: high");
	});

	it("passes a concrete model selector through untouched", () => {
		const plugin = pluginWithAgent(
			"name: review-rules\ndescription: Rules-check pass.\nmodel: anthropic/claude-mythos-5",
		);
		const agentDir = mkdtempSync(join(tmpdir(), "omp-agentdir-"));

		stageOmpAgents([plugin], { HOME: agentDir });

		expect(
			readFileSync(
				join(agentDir, ".omp", "agent", "agents", "review-rules.md"),
				"utf8",
			),
		).toContain("model: anthropic/claude-mythos-5");
	});

	it("skips a definition missing the fields omp requires", () => {
		const plugin = pluginWithAgent("name: review-rules\nmodel: opus");
		const agentDir = mkdtempSync(join(tmpdir(), "omp-agentdir-"));

		expect(stageOmpAgents([plugin], { HOME: agentDir })).toEqual([]);
	});

	it("tolerates a plugin with no agents directory", () => {
		const empty = mkdtempSync(join(tmpdir(), "omp-plugin-empty-"));
		const agentDir = mkdtempSync(join(tmpdir(), "omp-agentdir-"));

		expect(stageOmpAgents([empty], { HOME: agentDir })).toEqual([]);
	});

	it("resolves the config dir omp actually reads agents from", () => {
		// Not PI_CODING_AGENT_DIR: that relocates credential/session state, and
		// staging there leaves every definition undiscovered.
		expect(ompAgentsDir({ HOME: "/home/node" })).toBe(
			"/home/node/.omp/agent/agents",
		);
		expect(
			ompAgentsDir({ HOME: "/home/node", PI_CONFIG_DIR: ".omp-alt" }),
		).toBe("/home/node/.omp-alt/agent/agents");
	});
});
