import { readFile } from "node:fs/promises";
import type { EdgeWorkerConfig, ILogger } from "cyrus-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../src/ConfigManager.js";

vi.mock("node:fs/promises");

/**
 * Maintenance mode is toggled by editing config.json on a running worker, so
 * it has to survive the hot-reload pipeline: merged by `loadConfigSafely()`
 * and reported by `detectGlobalConfigChanges()`, or the edit is silently
 * dropped and the switch does nothing.
 *
 * Unlike every other flag here, omitting the key must CLEAR it: deleting the
 * key is how maintenance mode is turned off.
 */
describe("ConfigManager - maintenanceMode hot-reload", () => {
	let logger: ILogger;

	const baseConfig: EdgeWorkerConfig = {
		proxyUrl: "http://localhost:3000",
		cyrusHome: "/tmp/cyrus-home",
		repositories: [
			{
				id: "repo-1",
				name: "Repo 1",
				repositoryPath: "/test/repo",
				baseBranch: "main",
				workspaceBaseDir: "/test/workspaces",
			},
		],
	} as unknown as EdgeWorkerConfig;

	function makeManager(config: EdgeWorkerConfig): ConfigManager {
		return new ConfigManager(
			config,
			logger,
			"/tmp/cyrus-home/config.json",
			new Map(config.repositories.map((r) => [r.id, r])),
		);
	}

	function fileContains(extra: Record<string, unknown>): void {
		vi.mocked(readFile).mockResolvedValue(
			JSON.stringify({
				repositories: baseConfig.repositories,
				...extra,
			}) as never,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		logger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as unknown as ILogger;
	});

	it("merges maintenanceMode from the reloaded config file", async () => {
		const manager = makeManager(baseConfig);
		fileContains({
			maintenanceMode: { enabled: true, message: "back within an hour" },
		});

		const newConfig = await (
			manager as never as {
				loadConfigSafely: () => Promise<EdgeWorkerConfig | null>;
			}
		).loadConfigSafely();

		expect(newConfig?.maintenanceMode).toEqual({
			enabled: true,
			message: "back within an hour",
		});
	});

	it("clears maintenanceMode when the file omits the key", async () => {
		const manager = makeManager({
			...baseConfig,
			maintenanceMode: { enabled: true },
		} as EdgeWorkerConfig);
		fileContains({});

		const newConfig = await (
			manager as never as {
				loadConfigSafely: () => Promise<EdgeWorkerConfig | null>;
			}
		).loadConfigSafely();

		expect(newConfig?.maintenanceMode).toBeUndefined();
	});

	it("detects turning maintenance mode on as a global config change", () => {
		const manager = makeManager(baseConfig);

		const changed = (
			manager as never as {
				detectGlobalConfigChanges: (config: EdgeWorkerConfig) => boolean;
			}
		).detectGlobalConfigChanges({
			...baseConfig,
			maintenanceMode: { enabled: true },
		} as EdgeWorkerConfig);

		expect(changed).toBe(true);
	});

	it("detects turning maintenance mode off as a global config change", () => {
		const manager = makeManager({
			...baseConfig,
			maintenanceMode: { enabled: true },
		} as EdgeWorkerConfig);

		const changed = (
			manager as never as {
				detectGlobalConfigChanges: (config: EdgeWorkerConfig) => boolean;
			}
		).detectGlobalConfigChanges(baseConfig);

		expect(changed).toBe(true);
	});
});
