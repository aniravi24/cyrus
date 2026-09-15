import { EventEmitter } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import type { IAgentRunner, IMessageFormatter, SDKMessage } from "cyrus-core";
import { OmpMessageFormatter } from "./formatter.js";
import { ompAgentsDir, stageOmpAgents } from "./OmpAgentStager.js";

import { OMP_ABORT_MARKER, OmpEventMapper } from "./OmpEventMapper.js";

export { OMP_ABORT_MARKER };

import { resolveMcpPolicy } from "./OmpMcpPolicy.js";
import { OmpRpcProcess } from "./OmpRpcProcess.js";
import type {
	OmpExtensionUIRequestFrame,
	OmpFrame,
	OmpRpcProcessLike,
	OmpRunnerConfig,
	OmpSessionInfo,
	OmpSessionStats,
} from "./types.js";

const DEFAULT_MODEL_DISPLAY = "omp default model";

/** Marker on every aborted-session result; automation keys off it instead of provider error prose. */

/** Commands whose failure ends the run rather than just the command. */
const PROMPT_COMMANDS: Record<string, true> = {
	abort_and_prompt: true,
	follow_up: true,
	prompt: true,
	steer: true,
};

/** UI methods that block a tool call until the host answers. */
const BLOCKING_UI_METHODS: Record<string, true> = {
	confirm: true,
	editor: true,
	input: true,
	select: true,
};

/**
 * Runs a Cyrus session on `omp --mode rpc`, projecting its events onto the
 * Claude-SDK messages the edge worker consumes. `allowedTools` is deliberately
 * not forwarded: the tool surface is omp's, and guards are the repo's own hooks.
 */
export class OmpRunner extends EventEmitter implements IAgentRunner {
	readonly supportsStreamingInput = true;

	private process: OmpRpcProcessLike | null = null;
	private mapper: OmpEventMapper;
	private formatter = new OmpMessageFormatter();
	private messages: SDKMessage[] = [];
	private sessionInfo: OmpSessionInfo | null = null;
	private streaming = false;
	private streamClosed = false;
	private finalized = false;
	private emittedResult = false;
	private runSettled: (() => void) | null = null;
	private settled: Promise<void> = Promise.resolve();

	constructor(private readonly config: OmpRunnerConfig) {
		super();
		this.mapper = this.createMapper();
	}

	async start(prompt: string): Promise<OmpSessionInfo> {
		const info = await this.launch();
		try {
			await this.prompt(prompt);
		} catch (error) {
			this.failRun(error instanceof Error ? error.message : String(error));
		}
		await this.settled;
		this.finalize();
		this.process?.stop();
		return info;
	}

	async startStreaming(initialPrompt?: string): Promise<OmpSessionInfo> {
		const info = await this.launch();
		this.streaming = true;
		this.streamClosed = false;
		if (initialPrompt) await this.prompt(initialPrompt);
		return info;
	}

	addStreamMessage(content: string): void {
		if (!this.streaming || this.streamClosed) {
			throw new Error("omp runner is not accepting stream messages");
		}
		// follow_up queues behind the active turn and starts a new one when idle,
		// which is the semantics Cyrus wants for a comment arriving mid-session.
		this.process?.notify({ type: "follow_up", message: content });
	}

	completeStream(): void {
		this.streamClosed = true;
	}

	isStreaming(): boolean {
		return this.streaming && !this.streamClosed && this.isRunning();
	}

	stop(): void {
		// Cleanup paths in Cyrus routinely call stop() after omp already exited,
		// so nothing here may depend on a live child.
		if (this.process?.isRunning()) this.process.notify({ type: "abort" });
		this.process?.stop();
		this.finalize();
	}

	async interrupt(): Promise<void> {
		// Cyrus branches on isWarm() and can reach here after the child died; an
		// interrupt with nothing to interrupt is a no-op, not an error.
		if (!this.process?.isRunning()) return;
		await this.process.command({ type: "abort" });
	}

	isWarm(): boolean {
		// The RPC session stays open between turns, so steering and follow-ups
		// land on the same omp session instead of restarting it.
		return true;
	}

	isRunning(): boolean {
		return (
			this.sessionInfo?.isRunning === true && this.process?.isRunning() === true
		);
	}

	getMessages(): SDKMessage[] {
		return [...this.messages];
	}

	getFormatter(): IMessageFormatter {
		return this.formatter;
	}

	private createMapper(): OmpEventMapper {
		return new OmpEventMapper({
			includeThinking:
				this.config.omp?.includeThinking ?? this.config.includeThinking,
			mcpServers: Object.keys(this.config.mcpConfig ?? {}),
			model: this.config.model ?? DEFAULT_MODEL_DISPLAY,
			tools: this.config.allowedTools ?? [],
			workingDirectory: this.config.workingDirectory ?? cwd(),
		});
	}

	private async launch(): Promise<OmpSessionInfo> {
		if (this.process) throw new Error("omp runner already started");
		this.mapper = this.createMapper();
		this.mapper.resetTimer();
		this.messages = [];
		this.finalized = false;
		this.emittedResult = false;
		this.settled = new Promise<void>((resolve) => {
			this.runSettled = resolve;
		});
		this.stageAgents();

		const options = {
			args: this.buildArgs(),
			cwd: this.config.workingDirectory ?? cwd(),
			env: { ...process.env, ...this.config.env },
			ompPath: this.config.omp?.ompPath ?? this.config.ompPath ?? "omp",
		};
		const proc = this.config.processFactory
			? this.config.processFactory(options)
			: new OmpRpcProcess(options);
		this.process = proc;
		proc.on("frame", (frame: OmpFrame) => this.handleFrame(frame));
		proc.on("processError", (error: Error) => this.emitError(error));
		proc.on(
			"exit",
			({ code, stderr }: { code: number | null; stderr: string }) => {
				if (!this.finalized && !this.emittedResult) {
					const detail =
						code === 0
							? "omp exited before the run completed"
							: `omp exited with code ${String(code)}`;
					this.pushMessage(
						this.mapper.errorResult(
							`${OMP_ABORT_MARKER} ${detail}: ${stderr.slice(-500)}`,
						),
					);
				}
				this.settleRun();
				this.finalize();
			},
		);

		// Anything that throws past this point leaves a spawned child with nobody
		// holding it, so startup failures tear it down before rethrowing.
		try {
			await proc.start();
			proc.notify({
				level:
					this.config.omp?.subagentSubscription ??
					this.config.subagentSubscription ??
					"progress",
				type: "set_subagent_subscription",
			});

			const state = await proc.command({ type: "get_state" });
			const sessionId =
				typeof state.data?.sessionId === "string" ? state.data.sessionId : "";
			this.mapper.setSessionId(sessionId);
		} catch (error) {
			proc.stop();
			this.process = null;
			throw error;
		}

		this.sessionInfo = {
			isRunning: true,
			sessionId: this.mapper.getSessionId(),
			startedAt: new Date(),
		};
		for (const message of this.mapper.systemInit()) this.pushMessage(message);
		return this.sessionInfo;
	}

	private async prompt(message: string): Promise<void> {
		const response = await this.process?.command({
			message,
			streamingBehavior: "followUp",
			type: "prompt",
		});
		if (response && !response.success) {
			throw new Error(
				`omp rejected the prompt: ${response.error ?? "unknown error"}`,
			);
		}
		// A local-only prompt (slash command) never produces agent_end, so it is
		// complete the moment the response says the agent was not invoked.
		if (response?.data?.agentInvoked === false) this.settleRun();
	}

	private buildArgs(): string[] {
		const args = ["--mode", "rpc"];
		if (this.config.model) args.push("--model", this.config.model);
		args.push(
			"--approval-mode",
			this.config.omp?.approvalMode ?? this.config.approvalMode ?? "yolo",
		);
		if (
			this.config.resumeSessionId &&
			(this.config.runnerType ?? "omp") === "omp"
		) {
			args.push("--resume", this.config.resumeSessionId);
		}
		args.push("--config", this.writeSessionOverlay());
		for (const extra of this.config.configOverlays ?? []) {
			args.push("--config", extra);
		}
		return args;
	}

	/** omp finds plugin skills via `skills.customDirectories`, so the roots go in a config overlay. */
	/** Without this, a `subagent_type` dispatch fails and each pass silently drops to a bare default model. */
	private stageAgents(): void {
		const roots = this.pluginPaths();
		if (roots.length === 0) return;
		try {
			const staged = stageOmpAgents(roots, {
				...process.env,
				...this.config.env,
			});
			if (staged.length > 0) {
				this.config.logger?.debug?.(
					`Staged omp task agents: ${staged.join(", ")}`,
				);
			}
		} catch (error) {
			// A missing agent definition degrades the review passes; it must not
			// take the session down with it.
			this.emitError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	private pluginPaths(): string[] {
		return (this.config.plugins ?? [])
			.map((plugin) => (typeof plugin.path === "string" ? plugin.path : null))
			.filter((path): path is string => path !== null);
	}

	/**
	 * One overlay carrying the session's skill roots and MCP tool denials. Always
	 * written: without it omp reaches every MCP server the repo defines, which is
	 * a wider surface than the allowlist the Claude runner enforces.
	 */
	private writeSessionOverlay(): string {
		const roots = this.pluginPaths().map((path) => join(path, "skills"));
		const policy = resolveMcpPolicy(
			this.config.allowedTools,
			this.config.workingDirectory ?? cwd(),
		);
		this.writeMcpDenylist(policy.disabledServers);

		const lines: string[] = [];
		if (roots.length > 0) {
			lines.push("skills:", "  customDirectories:");
			for (const root of roots) lines.push(`    - ${JSON.stringify(root)}`);
		}
		if (policy.deniedTools.length > 0) {
			lines.push("tools:", "  approval:");
			for (const tool of policy.deniedTools) {
				lines.push(`    ${JSON.stringify(tool)}: deny`);
			}
		}

		const dir = join(this.config.cyrusHome, "omp-overlays");
		mkdirSync(dir, { recursive: true });
		const file = join(
			dir,
			`${(this.config.workspaceName ?? "session").replace(/[^\w.-]/g, "_")}.yml`,
		);
		writeFileSync(file, `${lines.join("\n")}\n`);
		return file;
	}

	/**
	 * `disabledServers` is omp's highest-precedence denylist and is read from the
	 * user config dir, so it is written next to the staged agents rather than
	 * into the repository checkout.
	 */
	private writeMcpDenylist(disabledServers: ReadonlyArray<string>): void {
		const agentsDir = ompAgentsDir({ ...process.env, ...this.config.env });
		const file = join(agentsDir, "..", "mcp.json");
		mkdirSync(join(agentsDir, ".."), { recursive: true });
		writeFileSync(file, `${JSON.stringify({ disabledServers }, null, "\t")}\n`);
	}

	private handleFrame(frame: OmpFrame): void {
		this.emit("frame", frame);

		if (frame.type === "extension_ui_request") {
			this.answerUIRequest(frame);
			return;
		}

		// A prompt is acked before the agent starts and can fail later with the same
		// id and no `agent_end`; without this the session hangs forever.
		if (frame.type === "response" && frame.success === false) {
			if (PROMPT_COMMANDS[frame.command]) {
				this.failRun(frame.error ?? `omp rejected ${frame.command}`);
			}
			return;
		}

		// `isTerminal: false` means omp scheduled more work, so the run has not
		// settled yet and Cyrus must not treat it as completion.
		if (frame.type === "agent_end" && frame.isTerminal !== false) {
			void this.finishRun(frame);
			return;
		}

		for (const message of this.mapper.map(frame)) this.pushMessage(message);
	}

	/** Fetch cost/token totals before mapping the terminal agent_end; failure degrades to zeros. */
	private async finishRun(frame: OmpFrame): Promise<void> {
		try {
			const response = await this.process?.command(
				{ type: "get_session_stats" },
				10_000,
			);
			if (response?.success && response.data) {
				// Every field on OmpSessionStats is optional, so a payload change
				// degrades to zeroed accounting instead of a wrong number.
				const stats = response.data as OmpSessionStats;
				this.mapper.applySessionStats(stats);
			}
		} catch (error) {
			this.emitError(error instanceof Error ? error : new Error(String(error)));
		}
		for (const message of this.mapper.map(frame)) this.pushMessage(message);
		this.settleRun();
	}

	/** No UI here, and an unanswered dialog stalls its tool call, so blocking methods are cancelled. */
	private answerUIRequest(frame: OmpExtensionUIRequestFrame): void {
		if (!BLOCKING_UI_METHODS[frame.method]) return;
		this.process?.notify({
			cancelled: true,
			id: frame.id,
			type: "extension_ui_response",
		});
	}

	/** Emit a terminal error result, then settle and finalize the run. */
	private failRun(reason: string): void {
		if (this.finalized) return;
		const text = `${OMP_ABORT_MARKER} ${reason}`;
		// The assistant text block is what surfaces the abort. Cyrus builds its
		// GitHub reply from the last assistant message and refuses to invent one,
		// so a result carrying the reason only in `errors[]` posts nothing - and a
		// review whose gate was already armed then stays pending forever.
		this.pushMessage(this.mapper.abortNotice(text));
		this.pushMessage(this.mapper.errorResult(text));
		this.settleRun();
		this.finalize();
	}

	private settleRun(): void {
		const settled = this.runSettled;
		this.runSettled = null;
		settled?.();
	}

	private finalize(): void {
		if (this.finalized) return;
		this.finalized = true;
		if (this.sessionInfo) {
			this.sessionInfo.isRunning = false;
			this.sessionInfo.sessionId = this.mapper.getSessionId();
		}
		this.streaming = false;
		this.emit("complete", [...this.messages]);
	}

	private pushMessage(message: SDKMessage): void {
		if (message.type === "result") this.emittedResult = true;
		this.messages.push(message);
		this.emit("message", message);
		void this.config.onMessage?.(message);
	}

	private emitError(error: Error): void {
		if (this.listenerCount("error") > 0) this.emit("error", error);
		void this.config.onError?.(error);
	}
}
