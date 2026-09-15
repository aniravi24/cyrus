import { EventEmitter } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { OmpMessageFormatter } from "./formatter.js";
import { stageOmpAgents } from "./OmpAgentStager.js";
import { OmpEventMapper } from "./OmpEventMapper.js";
import { OmpRpcProcess } from "./OmpRpcProcess.js";
const DEFAULT_MODEL_DISPLAY = "omp default model";
/**
 * Stable marker on every aborted-session result. Downstream automation keys off
 * it to tell "the agent could not run at all" apart from "the agent reported a
 * problem", without matching on provider error prose that changes upstream.
 */
export const OMP_ABORT_MARKER = "[omp:aborted]";
/** Commands whose failure ends the run rather than just the command. */
const PROMPT_COMMANDS = {
    abort_and_prompt: true,
    follow_up: true,
    prompt: true,
    steer: true,
};
/** UI methods that block a tool call until the host answers. */
const BLOCKING_UI_METHODS = {
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
export class OmpRunner extends EventEmitter {
    config;
    supportsStreamingInput = true;
    process = null;
    mapper;
    formatter = new OmpMessageFormatter();
    messages = [];
    sessionInfo = null;
    streaming = false;
    streamClosed = false;
    finalized = false;
    emittedResult = false;
    runSettled = null;
    settled = Promise.resolve();
    constructor(config) {
        super();
        this.config = config;
        this.mapper = this.createMapper();
    }
    async start(prompt) {
        const info = await this.launch();
        try {
            await this.prompt(prompt);
        }
        catch (error) {
            this.failRun(error instanceof Error ? error.message : String(error));
        }
        await this.settled;
        this.finalize();
        this.process?.stop();
        return info;
    }
    async startStreaming(initialPrompt) {
        const info = await this.launch();
        this.streaming = true;
        this.streamClosed = false;
        if (initialPrompt)
            await this.prompt(initialPrompt);
        return info;
    }
    addStreamMessage(content) {
        if (!this.streaming || this.streamClosed) {
            throw new Error("omp runner is not accepting stream messages");
        }
        // follow_up queues behind the active turn and starts a new one when idle,
        // which is the semantics Cyrus wants for a comment arriving mid-session.
        this.process?.notify({ type: "follow_up", message: content });
    }
    completeStream() {
        this.streamClosed = true;
    }
    isStreaming() {
        return this.streaming && !this.streamClosed && this.isRunning();
    }
    stop() {
        // Cleanup paths in Cyrus routinely call stop() after omp already exited,
        // so nothing here may depend on a live child.
        if (this.process?.isRunning())
            this.process.notify({ type: "abort" });
        this.process?.stop();
        this.finalize();
    }
    async interrupt() {
        // Cyrus branches on isWarm() and can reach here after the child died; an
        // interrupt with nothing to interrupt is a no-op, not an error.
        if (!this.process?.isRunning())
            return;
        await this.process.command({ type: "abort" });
    }
    isWarm() {
        // The RPC session stays open between turns, so steering and follow-ups
        // land on the same omp session instead of restarting it.
        return true;
    }
    isRunning() {
        return (this.sessionInfo?.isRunning === true && this.process?.isRunning() === true);
    }
    getMessages() {
        return [...this.messages];
    }
    getFormatter() {
        return this.formatter;
    }
    createMapper() {
        return new OmpEventMapper({
            includeThinking: this.config.omp?.includeThinking ?? this.config.includeThinking,
            mcpServers: Object.keys(this.config.mcpConfig ?? {}),
            model: this.config.model ?? DEFAULT_MODEL_DISPLAY,
            tools: this.config.allowedTools ?? [],
            workingDirectory: this.config.workingDirectory ?? cwd(),
        });
    }
    async launch() {
        if (this.process)
            throw new Error("omp runner already started");
        this.mapper = this.createMapper();
        this.mapper.resetTimer();
        this.messages = [];
        this.finalized = false;
        this.emittedResult = false;
        this.settled = new Promise((resolve) => {
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
        proc.on("frame", (frame) => this.handleFrame(frame));
        proc.on("processError", (error) => this.emitError(error));
        proc.on("exit", ({ code, stderr }) => {
            if (!this.finalized && !this.emittedResult) {
                const detail = code === 0
                    ? "omp exited before the run completed"
                    : `omp exited with code ${String(code)}`;
                this.pushMessage(this.mapper.errorResult(`${OMP_ABORT_MARKER} ${detail}: ${stderr.slice(-500)}`));
            }
            this.settleRun();
            this.finalize();
        });
        // Anything that throws past this point leaves a spawned child with nobody
        // holding it, so startup failures tear it down before rethrowing.
        try {
            await proc.start();
            proc.notify({
                level: this.config.omp?.subagentSubscription ??
                    this.config.subagentSubscription ??
                    "progress",
                type: "set_subagent_subscription",
            });
            const state = await proc.command({ type: "get_state" });
            const sessionId = typeof state.data?.sessionId === "string" ? state.data.sessionId : "";
            this.mapper.setSessionId(sessionId);
        }
        catch (error) {
            proc.stop();
            this.process = null;
            throw error;
        }
        this.sessionInfo = {
            isRunning: true,
            sessionId: this.mapper.getSessionId(),
            startedAt: new Date(),
        };
        for (const message of this.mapper.systemInit())
            this.pushMessage(message);
        return this.sessionInfo;
    }
    async prompt(message) {
        const response = await this.process?.command({
            message,
            streamingBehavior: "followUp",
            type: "prompt",
        });
        if (response && !response.success) {
            throw new Error(`omp rejected the prompt: ${response.error ?? "unknown error"}`);
        }
        // A local-only prompt (slash command) never produces agent_end, so it is
        // complete the moment the response says the agent was not invoked.
        if (response?.data?.agentInvoked === false)
            this.settleRun();
    }
    buildArgs() {
        const args = ["--mode", "rpc"];
        if (this.config.model)
            args.push("--model", this.config.model);
        args.push("--approval-mode", this.config.omp?.approvalMode ?? this.config.approvalMode ?? "yolo");
        if (this.config.resumeSessionId &&
            (this.config.runnerType ?? "omp") === "omp") {
            args.push("--resume", this.config.resumeSessionId);
        }
        const overlay = this.writeSkillOverlay();
        if (overlay)
            args.push("--config", overlay);
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
    /**
     * Translate Cyrus's plugin subagent definitions into omp's task-agent
     * contract. Without this a `subagent_type` dispatch fails and the caller
     * degrades to a bare model at default effort - for the review skill that
     * silently loses the pinned model and reasoning effort of every pass.
     */
    stageAgents() {
        const roots = this.pluginPaths();
        if (roots.length === 0)
            return;
        try {
            const staged = stageOmpAgents(roots, {
                ...process.env,
                ...this.config.env,
            });
            if (staged.length > 0) {
                this.config.logger?.debug?.(`Staged omp task agents: ${staged.join(", ")}`);
            }
        }
        catch (error) {
            // A missing agent definition degrades the review passes; it must not
            // take the session down with it.
            this.emitError(error instanceof Error ? error : new Error(String(error)));
        }
    }
    pluginPaths() {
        return (this.config.plugins ?? [])
            .map((plugin) => (typeof plugin.path === "string" ? plugin.path : null))
            .filter((path) => path !== null);
    }
    writeSkillOverlay() {
        const roots = this.pluginPaths().map((path) => join(path, "skills"));
        if (roots.length === 0)
            return null;
        const dir = join(this.config.cyrusHome, "omp-overlays");
        mkdirSync(dir, { recursive: true });
        const file = join(dir, `${(this.config.workspaceName ?? "session").replace(/[^\w.-]/g, "_")}.yml`);
        const body = ["skills:", "  customDirectories:"]
            .concat(roots.map((root) => `    - ${JSON.stringify(root)}`))
            .join("\n");
        writeFileSync(file, `${body}\n`);
        return file;
    }
    handleFrame(frame) {
        this.emit("frame", frame);
        if (frame.type === "extension_ui_request") {
            this.answerUIRequest(frame);
            return;
        }
        // `prompt` is acknowledged before the agent starts and can fail later with
        // the same id and no `agent_end` - no usable credential is the common case.
        // Treating that as terminal is what stops a session from hanging forever
        // and leaving a review's merge gate pending with nothing posted.
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
        for (const message of this.mapper.map(frame))
            this.pushMessage(message);
    }
    /**
     * The result message carries the session's cost and token totals, and omp
     * only reports those on request, so the stats round-trip has to complete
     * before the terminal `agent_end` is mapped. A failed or slow stats call
     * degrades to zeroed accounting rather than withholding the result.
     */
    async finishRun(frame) {
        try {
            const response = await this.process?.command({ type: "get_session_stats" }, 10_000);
            if (response?.success && response.data) {
                // Every field on OmpSessionStats is optional, so a payload change
                // degrades to zeroed accounting instead of a wrong number.
                const stats = response.data;
                this.mapper.applySessionStats(stats);
            }
        }
        catch (error) {
            this.emitError(error instanceof Error ? error : new Error(String(error)));
        }
        for (const message of this.mapper.map(frame))
            this.pushMessage(message);
        this.settleRun();
    }
    /**
     * Headless sessions have no UI, and an unanswered dialog stalls the tool call
     * that raised it, so blocking methods are cancelled and the rest ignored.
     */
    answerUIRequest(frame) {
        if (!BLOCKING_UI_METHODS[frame.method])
            return;
        this.process?.notify({
            cancelled: true,
            id: frame.id,
            type: "extension_ui_response",
        });
    }
    /** Emit a terminal error result, then settle and finalize the run. */
    failRun(reason) {
        if (this.finalized)
            return;
        this.pushMessage(this.mapper.errorResult(`${OMP_ABORT_MARKER} ${reason}`));
        this.settleRun();
        this.finalize();
    }
    settleRun() {
        const settled = this.runSettled;
        this.runSettled = null;
        settled?.();
    }
    finalize() {
        if (this.finalized)
            return;
        this.finalized = true;
        if (this.sessionInfo) {
            this.sessionInfo.isRunning = false;
            this.sessionInfo.sessionId = this.mapper.getSessionId();
        }
        this.streaming = false;
        this.emit("complete", [...this.messages]);
    }
    pushMessage(message) {
        if (message.type === "result")
            this.emittedResult = true;
        this.messages.push(message);
        this.emit("message", message);
        void this.config.onMessage?.(message);
    }
    emitError(error) {
        if (this.listenerCount("error") > 0)
            this.emit("error", error);
        void this.config.onError?.(error);
    }
}
//# sourceMappingURL=OmpRunner.js.map