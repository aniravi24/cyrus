import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_MAINTENANCE_MESSAGE,
	EdgeWorker,
	GITHUB_MAINTENANCE_MARKER,
} from "../src/EdgeWorker.js";
import { SessionSemaphore } from "../src/RunnerConcurrency.js";

/**
 * Maintenance mode: events are still accepted, no session starts, and the
 * caller is told why. Exercised against a minimal `this` shape, the same way
 * EdgeWorker.github-token-resolution.test.ts does, so the heavy constructor
 * stays out of it.
 */

type MaintenanceMode = { enabled: boolean; message: string };

const getMaintenanceMode = (
	EdgeWorker.prototype as unknown as {
		getMaintenanceMode: () => MaintenanceMode;
	}
).getMaintenanceMode;

function readMode(config: unknown): MaintenanceMode {
	return getMaintenanceMode.call({ config } as never);
}

const BOT = "gplpmatch-bot";

function prCommentEvent(body: string) {
	return {
		payload: {
			repository: {
				full_name: "prophetiqhq/prophetiq",
				name: "prophetiq",
				owner: { login: "prophetiqhq" },
			},
			issue: {
				number: 42,
				title: "Add a thing",
				pull_request: { url: "https://api.github.com/pulls/42" },
			},
			comment: { id: 7, body, user: { login: "a-human" } },
		},
	};
}

function githubHarness(config: unknown) {
	const postIssueComment = vi.fn().mockResolvedValue(undefined);
	const addReaction = vi.fn().mockResolvedValue(undefined);
	const createGitHubWorkspace = vi.fn();
	const fakeThis = {
		config,
		getMaintenanceMode,
		activeWebhookCount: 0,
		activeGitHubPrSessions: new Set<string>(),
		queuedGitHubPrEvents: new Map<string, unknown[]>(),
		agentSessionManager: {},
		logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
		gitHubCommentService: { postIssueComment, addReaction },
		resolveGitHubToken: vi.fn().mockResolvedValue("ghs_token"),
		findRepositoryByGitHubUrl: vi.fn().mockReturnValue(null),
		createGitHubWorkspace,
		savePersistedState: vi.fn().mockResolvedValue(undefined),
	};

	const handle = (event: unknown) =>
		(
			EdgeWorker.prototype as unknown as {
				handleGitHubWebhook: (event: unknown) => Promise<void>;
			}
		).handleGitHubWebhook.call(fakeThis, event);

	return { handle, postIssueComment, addReaction, createGitHubWorkspace };
}

function runnerHarness(config: unknown) {
	const runner = {
		start: vi.fn(),
		startStreaming: vi.fn(),
		isRunning: () => false,
	};
	const buildRunnerForType = vi.fn().mockReturnValue(runner);
	const fakeThis = {
		config,
		getMaintenanceMode,
		buildRunnerForType,
		runnerSlots: new SessionSemaphore(Number.POSITIVE_INFINITY),
	};

	const create = () =>
		(
			EdgeWorker.prototype as unknown as {
				createRunnerForType: (runnerType: string, config: unknown) => unknown;
			}
		).createRunnerForType.call(fakeThis, "omp", {});

	return { create, buildRunnerForType };
}

describe("maintenance mode", () => {
	const saved: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const key of [
			"CYRUS_MAINTENANCE_MODE",
			"CYRUS_MAINTENANCE_MESSAGE",
			"GITHUB_BOT_USERNAME",
		]) {
			saved[key] = process.env[key];
			delete process.env[key];
		}
		process.env.GITHUB_BOT_USERNAME = BOT;
	});

	afterEach(() => {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	});

	describe("resolution", () => {
		it("is off when neither the config block nor the env var is set", () => {
			expect(readMode({}).enabled).toBe(false);
		});

		it("is off when the config block says so", () => {
			expect(readMode({ maintenanceMode: { enabled: false } }).enabled).toBe(
				false,
			);
		});

		it("is on when the config block says so", () => {
			expect(readMode({ maintenanceMode: { enabled: true } }).enabled).toBe(
				true,
			);
		});

		it.each([
			"true",
			"1",
			"yes",
			"YES",
			" True ",
		])("is forced on by CYRUS_MAINTENANCE_MODE=%j even when the config says off", (value) => {
			process.env.CYRUS_MAINTENANCE_MODE = value;
			expect(readMode({ maintenanceMode: { enabled: false } }).enabled).toBe(
				true,
			);
		});

		it("ignores a CYRUS_MAINTENANCE_MODE value that is not affirmative", () => {
			process.env.CYRUS_MAINTENANCE_MODE = "false";
			expect(readMode({}).enabled).toBe(false);
		});

		it("prefers the env message, then the configured one, then the default", () => {
			expect(readMode({}).message).toBe(DEFAULT_MAINTENANCE_MESSAGE);
			expect(
				readMode({ maintenanceMode: { enabled: true, message: "cfg" } })
					.message,
			).toBe("cfg");
			process.env.CYRUS_MAINTENANCE_MESSAGE = "env";
			expect(
				readMode({ maintenanceMode: { enabled: true, message: "cfg" } })
					.message,
			).toBe("env");
		});
	});

	describe("GitHub webhook", () => {
		it("declines a mention with the notice and starts nothing", async () => {
			const { handle, postIssueComment, addReaction, createGitHubWorkspace } =
				githubHarness({ maintenanceMode: { enabled: true } });

			await handle(prCommentEvent(`@${BOT} please review`));

			expect(postIssueComment).toHaveBeenCalledTimes(1);
			const body = postIssueComment.mock.calls[0]![0].body as string;
			expect(body).toContain(DEFAULT_MAINTENANCE_MESSAGE);
			expect(body).toContain(GITHUB_MAINTENANCE_MARKER);
			expect(postIssueComment.mock.calls[0]![0]).toMatchObject({
				owner: "prophetiqhq",
				repo: "prophetiq",
				issueNumber: 42,
			});
			// No 👀 reaction: an acknowledgement with no session behind it reads
			// as work in progress.
			expect(addReaction).not.toHaveBeenCalled();
			expect(createGitHubWorkspace).not.toHaveBeenCalled();
		});

		it("posts the configured message when one is set", async () => {
			const { handle, postIssueComment } = githubHarness({
				maintenanceMode: { enabled: true, message: "Back Monday." },
			});

			await handle(prCommentEvent(`@${BOT} please review`));

			const body = postIssueComment.mock.calls[0]![0].body as string;
			expect(body).toContain("Back Monday.");
			expect(body).not.toContain(DEFAULT_MAINTENANCE_MESSAGE);
		});

		it("stays silent on a comment that does not mention the bot", async () => {
			const { handle, postIssueComment } = githubHarness({
				maintenanceMode: { enabled: true },
			});

			await handle(prCommentEvent("unrelated chatter"));

			expect(postIssueComment).not.toHaveBeenCalled();
		});

		it("does not intercept when maintenance mode is off", async () => {
			const { handle, postIssueComment, addReaction } = githubHarness({});

			await handle(prCommentEvent(`@${BOT} please review`));

			expect(addReaction).toHaveBeenCalledTimes(1);
			// The repository lookup is stubbed empty, so the handler falls through
			// to its unconfigured-repo notice. Either way, not the maintenance one.
			for (const call of postIssueComment.mock.calls) {
				expect(call[0].body).not.toContain(GITHUB_MAINTENANCE_MARKER);
			}
		});
	});

	describe("runner backstop", () => {
		it("refuses to build a runner, covering resume and retry paths", () => {
			const { create, buildRunnerForType } = runnerHarness({
				maintenanceMode: { enabled: true },
			});

			expect(create).toThrow(/maintenance mode/i);
			expect(buildRunnerForType).not.toHaveBeenCalled();
		});

		it("builds a runner as usual when maintenance mode is off", () => {
			const { create, buildRunnerForType } = runnerHarness({});

			expect(create()).toBeDefined();
			expect(buildRunnerForType).toHaveBeenCalledTimes(1);
		});
	});
});
