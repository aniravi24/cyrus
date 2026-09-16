import type { CyrusAgentSession, ILogger, RepositoryConfig } from "cyrus-core";
import { describe, expect, it } from "vitest";
import {
	type IChatToolResolver,
	type IMcpConfigProvider,
	type IRunnerSelector,
	RunnerConfigBuilder,
} from "../src/RunnerConfigBuilder.js";

const silentLogger: ILogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
} as unknown as ILogger;

function makeBuilder(): RunnerConfigBuilder {
	const chatToolResolver: IChatToolResolver = {
		buildChatAllowedTools: () => ["Read(**)"],
	};
	const mcpConfigProvider: IMcpConfigProvider = {
		buildMcpConfig: () => ({}),
		buildMergedMcpConfigPath: () => undefined,
	};
	const runnerSelector: IRunnerSelector = {
		determineRunnerSelection: () => ({ runnerType: "omp" as const }),
		getDefaultModelForRunner: () => "opus",
		getDefaultEffortForRunner: () => undefined,
		getDefaultFallbackModelForRunner: () => "openai-codex/gpt-5.6-sol",
	};
	return new RunnerConfigBuilder(
		chatToolResolver,
		mcpConfigProvider,
		runnerSelector,
	);
}

function buildOmpConfig(plugins: { type: "local"; path: string }[]) {
	const session = {
		issueId: "issue-1",
		issue: { identifier: "ABC-1" },
		workspace: {
			path: "/ws/repo-a",
			isGitWorktree: true,
		},
	} as unknown as CyrusAgentSession;
	const repository = {
		id: "repo-a",
		name: "Repo A",
		repositoryPath: "/repos/repo-a",
		allowedTools: [],
	} as unknown as RepositoryConfig;

	return makeBuilder().buildIssueConfig({
		session,
		repository,
		sessionId: "sess-1",
		systemPrompt: "test",
		allowedTools: ["Read(**)"],
		allowedDirectories: ["/repos/repo-a"],
		disallowedTools: [],
		cyrusHome: "/tmp/cyrus-home",
		linearWorkspaceId: "ws-1",
		logger: silentLogger,
		onMessage: () => {},
		onError: () => {},
		requireLinearWorkspaceId: () => "ws-1",
		plugins,
		skills: ["review"],
	});
}

describe("RunnerConfigBuilder omp managed skills", () => {
	it("passes scoped plugins and skill names to omp runner configs", () => {
		const plugins = [{ type: "local" as const, path: "/cyrus/user-skills" }];

		const { config, runnerType } = buildOmpConfig(plugins);

		// OmpRunner derives `skills.customDirectories` from config.plugins; dropping
		// them here starts every session with no skills at all.
		expect(runnerType).toBe("omp");
		expect(config.plugins).toEqual(plugins);
		expect(config.skills).toEqual(["review"]);
	});
});
