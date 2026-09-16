import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OMP_ABORT_MARKER, OmpRunner } from "./OmpRunner.js";
import type { OmpFrame, OmpResponseFrame, OmpRpcProcessLike } from "./types.js";

/**
 * Stands in for the omp child process. `script` frames are emitted after the
 * prompt is accepted, which is where omp reports a failure that arrives with the
 * prompt's own id and no `agent_end`.
 */
class FakeProcess extends EventEmitter implements OmpRpcProcessLike {
	running = true;
	stopped = false;

	constructor(
		private readonly promptResponse: OmpResponseFrame,
		private readonly script: OmpFrame[] = [],
	) {
		super();
	}

	async start(): Promise<unknown> {
		return { protocolVersion: 1, type: "ready" };
	}

	notify(): void {
		if (!this.running) throw new Error("omp process is not running");
	}

	async command(frame: Record<string, unknown>): Promise<OmpResponseFrame> {
		if (frame.type === "get_state") {
			return {
				command: "get_state",
				data: { sessionId: "01a0-fake-session" },
				success: true,
				type: "response",
			};
		}
		if (frame.type === "prompt") {
			// Accepted now; the real failure lands later on the frame stream. A
			// microtask, not a timer: ordering is what matters, not elapsed time.
			queueMicrotask(() => {
				this.emit("frame", this.promptResponse);
				for (const scripted of this.script) this.emit("frame", scripted);
			});
			return { command: "prompt", success: true, type: "response" };
		}
		return { command: String(frame.type), success: true, type: "response" };
	}

	stop(): void {
		this.stopped = true;
		this.running = false;
	}

	isRunning(): boolean {
		return this.running;
	}
}

function runnerWith(process: FakeProcess): OmpRunner {
	return new OmpRunner({
		cyrusHome: "/tmp/omp-runner-test",
		model: "anthropic/claude-opus-5",
		processFactory: () => process,
		workingDirectory: "/tmp/omp-runner-test",
		workspaceName: "test",
	});
}

describe("OmpRunner", () => {
	it("ends the run when a prompt fails after being accepted", async () => {
		// omp acks `prompt`, then reports the failure with the same id and never
		// emits agent_end. Left unhandled the session hangs, which strands the
		// worktree and leaves a review's merge gate pending forever.
		const fake = new FakeProcess({
			command: "prompt",
			error: "No API key found for openai.",
			id: "cyrus_1",
			success: false,
			type: "response",
		});
		const runner = runnerWith(fake);

		await runner.start("say hi");

		const result = runner.getMessages().find((m) => m.type === "result");
		expect(result?.type).toBe("result");
		if (result?.type !== "result") return;
		expect(result.is_error).toBe(true);
		const errors = "errors" in result ? result.errors : [];
		expect(errors.join(" ")).toContain(OMP_ABORT_MARKER);
		expect(errors.join(" ")).toContain("No API key found");
		expect(runner.isRunning()).toBe(false);

		// Cyrus builds its GitHub reply from the last assistant TEXT block and
		// invents nothing, so an abort that only fills `errors[]` posts no comment
		// and leaves an armed review gate pending forever.
		const assistant = runner
			.getMessages()
			.filter((m) => m.type === "assistant")
			.flatMap((m) =>
				m.type === "assistant"
					? m.message.content.map((b) => (b.type === "text" ? b.text : ""))
					: [],
			);
		expect(assistant.join(" ")).toContain(OMP_ABORT_MARKER);
		expect(assistant.join(" ")).toContain("No API key found");
	});

	it("still produces a result when omp exits without finishing the run", async () => {
		// A clean exit mid-run (stdin closed, child killed) used to settle with no
		// result at all, which strands a review's merge gate exactly like a hang.
		const fake = new FakeProcess({
			command: "prompt",
			success: true,
			type: "response",
		});
		const runner = runnerWith(fake);
		const started = runner.start("say hi");
		queueMicrotask(() =>
			fake.emit("exit", { code: 0, signal: null, stderr: "" }),
		);
		await started;

		const result = runner.getMessages().find((m) => m.type === "result");
		expect(result?.type).toBe("result");
		if (result?.type !== "result") return;
		expect(result.is_error).toBe(true);
		const errors = "errors" in result ? result.errors : [];
		expect(errors.join(" ")).toContain(OMP_ABORT_MARKER);
		expect(errors.join(" ")).toContain("exited before the run completed");
	});

	it("tolerates stop() and interrupt() after the child is gone", async () => {
		const fake = new FakeProcess({
			command: "prompt",
			success: true,
			type: "response",
		});
		const runner = runnerWith(fake);
		const started = runner.start("say hi");
		queueMicrotask(() =>
			fake.emit("exit", { code: 0, signal: null, stderr: "" }),
		);
		await started;
		fake.running = false;

		// Cyrus calls both on cleanup paths that run after omp has exited.
		expect(() => runner.stop()).not.toThrow();
		await expect(runner.interrupt()).resolves.toBeUndefined();
	});

	it("reports a model fallback so the switch is visible in the timeline", async () => {
		const fake = new FakeProcess(
			{ command: "prompt", success: true, type: "response" },
			[
				{
					from: "openai-codex/gpt-5.5:high",
					to: "anthropic/claude-opus-5:high",
					type: "retry_fallback_applied",
				},
				{ isTerminal: true, messages: [], type: "agent_end" },
			],
		);
		const runner = runnerWith(fake);

		await runner.start("say hi");

		const texts = runner
			.getMessages()
			.filter((m) => m.type === "assistant")
			.flatMap((m) =>
				m.type === "assistant"
					? m.message.content.map((block) =>
							block.type === "text" ? block.text : "",
						)
					: [],
			);
		expect(texts.join(" ")).toContain("Model fallback");
		expect(texts.join(" ")).toContain("anthropic/claude-opus-5:high");
	});

	it("writes the MCP denylist into the relocated agent dir, keeping existing servers", async () => {
		// omp reads `disabledServers` from the user MCP config in its ACTIVE native
		// agent directory. PI_CODING_AGENT_DIR relocates that directory, so writing
		// to $HOME/.omp/agent leaves every server reachable at runtime.
		const agentDir = mkdtempSync(join(tmpdir(), "omp-agent-dir-"));
		const workDir = mkdtempSync(join(tmpdir(), "omp-work-"));
		// A plugin-provided server already in the agent dir's user config: the
		// denylist write must not clobber it.
		writeFileSync(
			join(agentDir, "mcp.json"),
			JSON.stringify({ mcpServers: { "context-mode": { command: "node" } } }),
		);
		writeFileSync(
			join(workDir, ".mcp.json"),
			JSON.stringify({
				mcpServers: { codanna: { command: "c" }, stripe: { command: "s" } },
			}),
		);
		const fake = new FakeProcess(
			{ command: "prompt", id: "cyrus_1", success: true, type: "response" },
			[{ isTerminal: true, messages: [], type: "agent_end" }],
		);
		const runner = new OmpRunner({
			allowedTools: ["mcp__codanna"],
			cyrusHome: agentDir,
			env: { PI_CODING_AGENT_DIR: agentDir },
			model: "anthropic/claude-opus-5",
			processFactory: () => fake,
			workingDirectory: workDir,
			workspaceName: "test",
		});

		await runner.start("say hi");

		const written = JSON.parse(
			readFileSync(join(agentDir, "mcp.json"), "utf8"),
		) as {
			disabledServers?: string[];
			mcpServers?: Record<string, unknown>;
		};
		expect(written.disabledServers ?? []).toContain("stripe");
		expect(Object.keys(written.mcpServers ?? {})).toContain("context-mode");
	});
});
