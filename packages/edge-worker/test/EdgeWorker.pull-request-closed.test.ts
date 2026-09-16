import { LinearClient } from "@linear/sdk";
import { LinearEventTransport } from "cyrus-linear-event-transport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentSessionManager } from "../src/AgentSessionManager.js";
import { EdgeWorker } from "../src/EdgeWorker.js";
import { SharedApplicationServer } from "../src/SharedApplicationServer.js";
import type { EdgeWorkerConfig, RepositoryConfig } from "../src/types.js";
import { TEST_CYRUS_HOME } from "./test-dirs.js";

vi.mock("fs/promises");
vi.mock("@linear/sdk");
vi.mock("cyrus-linear-event-transport");
vi.mock("../src/AgentSessionManager.js");
vi.mock("../src/SharedApplicationServer.js");
vi.mock("cyrus-core", async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		PersistenceManager: vi.fn().mockImplementation(function () {
			return {
				loadEdgeWorkerState: vi.fn().mockResolvedValue(null),
				saveEdgeWorkerState: vi.fn().mockResolvedValue(undefined),
			};
		}),
	};
});

const mockRepository: RepositoryConfig = {
	id: "test-repo",
	name: "Test Repo",
	repositoryPath: "/test/repo",
	workspaceBaseDir: "/test/workspaces",
	baseBranch: "main",
	linearWorkspaceId: "test-workspace",
	isActive: true,
	allowedTools: ["Read", "Edit"],
};

function closedPayload(merged: boolean) {
	return {
		action: "closed",
		pull_request: { merged, number: 4457 },
		repository: { full_name: "prophetiqhq/prophetiq" },
		sender: { login: "aniravi24" },
	} as any;
}

describe("EdgeWorker - closed pull requests", () => {
	let edgeWorker: EdgeWorker;
	let mockAgentSessionManager: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});

		mockAgentSessionManager = {
			createCyrusAgentSession: vi.fn(),
			getSessionsByIssueId: vi.fn().mockReturnValue([]),
			on: vi.fn(),
			requestSessionStop: vi.fn(),
			restoreState: vi.fn(),
			serializeState: vi.fn().mockReturnValue({ entries: {}, sessions: {} }),
		};
		vi.mocked(AgentSessionManager).mockImplementation(function () {
			return mockAgentSessionManager;
		});
		vi.mocked(SharedApplicationServer).mockImplementation(function () {
			return {
				getFastifyInstance: vi.fn().mockReturnValue({ post: vi.fn() }),
				getWebhookUrl: vi.fn().mockReturnValue("http://localhost:3456/webhook"),
				registerOAuthCallbackHandler: vi.fn(),
				start: vi.fn().mockResolvedValue(undefined),
				stop: vi.fn().mockResolvedValue(undefined),
			} as any;
		});
		vi.mocked(LinearEventTransport).mockImplementation(function () {
			return {
				on: vi.fn(),
				register: vi.fn(),
				removeAllListeners: vi.fn(),
			} as any;
		});
		vi.mocked(LinearClient).mockImplementation(function () {
			return {
				users: { me: vi.fn().mockResolvedValue({ id: "user-123" }) },
			} as any;
		});

		const mockConfig: EdgeWorkerConfig = {
			cyrusHome: TEST_CYRUS_HOME,
			handlers: {
				createWorkspace: vi.fn().mockResolvedValue({
					isGitWorktree: false,
					path: "/test/workspaces/PR-4457",
				}),
			},
			linearWorkspaces: { "test-workspace": { linearToken: "test-token" } },
			proxyUrl: "http://localhost:3000",
			repositories: [mockRepository],
		};
		edgeWorker = new EdgeWorker(mockConfig);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("stops running sessions for the closed PR and clears its queue", async () => {
		const stop = vi.fn();
		mockAgentSessionManager.getSessionsByIssueId.mockReturnValue([
			{ agentRunner: { isRunning: () => true, stop }, id: "session-live" },
			{
				agentRunner: { isRunning: () => false, stop: vi.fn() },
				id: "session-done",
			},
		]);
		const key = "github:prophetiqhq/prophetiq#4457";
		(edgeWorker as any).activeGitHubPrSessions.add(key);
		(edgeWorker as any).queuedGitHubPrEvents.set(key, [{}]);

		await (edgeWorker as any).handleGitHubPullRequestClosed(
			closedPayload(true),
		);

		expect(mockAgentSessionManager.getSessionsByIssueId).toHaveBeenCalledWith(
			key,
		);
		expect(stop).toHaveBeenCalledTimes(1);
		expect(mockAgentSessionManager.requestSessionStop).toHaveBeenCalledWith(
			"session-live",
		);
		// A queued event would start a fresh review on the PR that just closed.
		expect((edgeWorker as any).queuedGitHubPrEvents.has(key)).toBe(false);
		expect((edgeWorker as any).activeGitHubPrSessions.has(key)).toBe(false);
	});

	it("stops sessions on an abandoned PR too, not just a merge", async () => {
		const stop = vi.fn();
		mockAgentSessionManager.getSessionsByIssueId.mockReturnValue([
			{ agentRunner: { isRunning: () => true, stop }, id: "session-live" },
		]);

		await (edgeWorker as any).handleGitHubPullRequestClosed(
			closedPayload(false),
		);

		expect(stop).toHaveBeenCalledTimes(1);
	});

	it("leaves an already-finished session alone", async () => {
		const stop = vi.fn();
		mockAgentSessionManager.getSessionsByIssueId.mockReturnValue([
			{ agentRunner: { isRunning: () => false, stop }, id: "session-done" },
		]);

		await (edgeWorker as any).handleGitHubPullRequestClosed(
			closedPayload(true),
		);

		expect(stop).not.toHaveBeenCalled();
		expect(mockAgentSessionManager.requestSessionStop).not.toHaveBeenCalled();
	});
});
