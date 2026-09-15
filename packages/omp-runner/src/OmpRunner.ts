import { EventEmitter } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import type { IAgentRunner, IMessageFormatter, SDKMessage } from "cyrus-core";
import { OmpMessageFormatter } from "./formatter.js";
import { OmpEventMapper } from "./OmpEventMapper.js";
import { OmpRpcProcess } from "./OmpRpcProcess.js";
import type {
	OmpExtensionUIRequestFrame,
	OmpFrame,
	OmpRunnerConfig,
	OmpSessionInfo,
} from "./types.js";

const DEFAULT_MODEL_DISPLAY = "omp default model";

/** UI methods that block a tool call until the host answers. */
const BLOCKING_UI_METHODS: Record<string, true> = {
	confirm: true,
	editor: true,
	input: true,
	select: true,
};

/**
 * Runs a Cyrus session on omp (`omp --mode rpc`) and projects its event stream
 * onto the Claude-SDK messages the edge worker consumes.
 *
 * The tool surface belongs to omp, not to Cyrus: `allowedTools` is not
 * forwarded, so the session keeps omp's full capability set (subagents, eval,
 * browser, lsp). Guard enforcement is the repository's own hooks.
 */
export class OmpRunner extends EventEmitter implements IAgentRunner {
	readonly supportsStreamingInput = true;

	private process: OmpRpcProcess | null = null;
	private mapper: OmpEventMapper;
	private formatter = new OmpMessageFormatter();
	private messages: SDKMessage[] = [];
	private sessionInfo: OmpSessionInfo | null = null;
	private streaming = false;
	private streamClosed = false;
	private finalized = false;
	private runSettled: (() => void) | null = null;

	constructor(private readonly config: OmpRunnerConfig) {
		super();
		this.mapper = this.createMapper();
	}

	async start(prompt: string): Promise<OmpSessionInfo> {
		const info = await this.launch();
		await this.prompt(prompt);
		await new Promise<void>((resolve) => {
			this.runSettled = resolve;
		});
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
		this.process?.notify({ type: "abort" });
		this.process?.stop();
		this.finalize();
	}

	async interrupt(): Promise<void> {
		await this.process?.command({ type: "abort" });
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
			includeThinking: this.config.includeThinking,
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

		const proc = new OmpRpcProcess({
			args: this.buildArgs(),
			cwd: this.config.workingDirectory ?? cwd(),
			env: { ...process.env, ...this.config.env },
			ompPath: this.config.ompPath ?? "omp",
		});
		this.process = proc;
		proc.on("frame", (frame: OmpFrame) => this.handleFrame(frame));
		proc.on("processError", (error: Error) => this.emitError(error));
		proc.on(
			"exit",
			({ code, stderr }: { code: number | null; stderr: string }) => {
				if (!this.finalized && code !== 0) {
					this.pushMessage(
						this.mapper.errorResult(
							`omp exited with code ${String(code)}: ${stderr.slice(-500)}`,
						),
					);
				}
				this.settleRun();
				this.finalize();
			},
		);

		await proc.start();
		proc.notify({
			level: this.config.subagentSubscription ?? "progress",
			type: "set_subagent_subscription",
		});

		const state = await proc.command({ type: "get_state" });
		const sessionId =
			typeof state.data?.sessionId === "string" ? state.data.sessionId : "";
		this.mapper.setSessionId(sessionId);

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
		args.push("--approval-mode", this.config.approvalMode ?? "yolo");
		if (
			this.config.resumeSessionId &&
			(this.config.runnerType ?? "omp") === "omp"
		) {
			args.push("--resume", this.config.resumeSessionId);
		}
		const overlay = this.writeSkillOverlay();
		if (overlay) args.push("--config", overlay);
		for (const extra of this.config.configOverlays ?? []) {
			args.push("--config", extra);
		}
		return args;
	}

	/**
	 * Cyrus ships its workflow skills as SDK plugin directories, which only the
	 * Claude runner reads natively. omp discovers them through
	 * `skills.customDirectories`, so the plugin roots are written into a config
	 * overlay instead of being staged into a provider-specific layout.
	 */
	private writeSkillOverlay(): string | null {
		const roots = (this.config.plugins ?? [])
			.map((plugin) => (typeof plugin.path === "string" ? plugin.path : null))
			.filter((path): path is string => path !== null)
			.map((path) => join(path, "skills"));
		if (roots.length === 0) return null;

		const dir = join(this.config.cyrusHome, "omp-overlays");
		mkdirSync(dir, { recursive: true });
		const file = join(
			dir,
			`${(this.config.workspaceName ?? "session").replace(/[^\w.-]/g, "_")}.yml`,
		);
		const body = ["skills:", "  customDirectories:"]
			.concat(roots.map((root) => `    - ${JSON.stringify(root)}`))
			.join("\n");
		writeFileSync(file, `${body}\n`);
		return file;
	}

	private handleFrame(frame: OmpFrame): void {
		this.emit("frame", frame);

		if (frame.type === "extension_ui_request") {
			this.answerUIRequest(frame);
			return;
		}

		for (const message of this.mapper.map(frame)) this.pushMessage(message);

		// `isTerminal: false` means omp scheduled more work, so the run has not
		// settled yet and Cyrus must not treat it as completion.
		if (frame.type === "agent_end" && frame.isTerminal !== false) {
			this.settleRun();
		}
	}

	/**
	 * Headless sessions have no UI, and an unanswered dialog stalls the tool call
	 * that raised it, so blocking methods are cancelled and the rest ignored.
	 */
	private answerUIRequest(frame: OmpExtensionUIRequestFrame): void {
		if (!BLOCKING_UI_METHODS[frame.method]) return;
		this.process?.notify({
			cancelled: true,
			id: frame.id,
			type: "extension_ui_response",
		});
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
		this.messages.push(message);
		this.emit("message", message);
		void this.config.onMessage?.(message);
	}

	private emitError(error: Error): void {
		if (this.listenerCount("error") > 0) this.emit("error", error);
		void this.config.onError?.(error);
	}
}
