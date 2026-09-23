import { EventEmitter } from "node:events";
import type { IAgentRunner, IMessageFormatter, SDKMessage } from "cyrus-core";
import { OMP_ABORT_MARKER } from "./OmpEventMapper.js";
export { OMP_ABORT_MARKER };
import type { OmpRunnerConfig, OmpSessionInfo } from "./types.js";
/**
 * Runs a Cyrus session on `omp --mode rpc`, projecting its events onto the
 * Claude-SDK messages the edge worker consumes. `allowedTools` is deliberately
 * not forwarded: the tool surface is omp's, and guards are the repo's own hooks.
 */
export declare class OmpRunner extends EventEmitter implements IAgentRunner {
    private readonly config;
    readonly supportsStreamingInput = true;
    private process;
    private mapper;
    private formatter;
    private messages;
    private sessionInfo;
    private streaming;
    private streamClosed;
    private finalized;
    private emittedResult;
    private runSettled;
    private settled;
    constructor(config: OmpRunnerConfig);
    start(prompt: string): Promise<OmpSessionInfo>;
    startStreaming(initialPrompt?: string): Promise<OmpSessionInfo>;
    addStreamMessage(content: string): void;
    completeStream(): void;
    isStreaming(): boolean;
    stop(): void;
    interrupt(): Promise<void>;
    isWarm(): boolean;
    isRunning(): boolean;
    getMessages(): SDKMessage[];
    getFormatter(): IMessageFormatter;
    private createMapper;
    private launch;
    private prompt;
    private buildArgs;
    /** omp finds plugin skills via `skills.customDirectories`, so the roots go in a config overlay. */
    /** Without this, a `subagent_type` dispatch fails and each pass silently drops to a bare default model. */
    private stageAgents;
    private pluginPaths;
    /**
     * One overlay carrying the session's skill roots and MCP tool denials. Always
     * written: without it omp reaches every MCP server the repo defines, which is
     * a wider surface than the allowlist the Claude runner enforces.
     */
    private writeSessionOverlay;
    /**
     * `disabledServers` is omp's highest-precedence denylist, read from the user
     * MCP config in the *active native agent directory*. `PI_CODING_AGENT_DIR`
     * relocates that directory, so the denylist must follow it: writing to
     * `$HOME/.omp/agent` while a session runs against a relocated dir leaves the
     * allowlist unenforced at the server level. Merges into any existing file so a
     * plugin-provided `mcpServers` entry there survives.
     */
    private writeMcpDenylist;
    private handleFrame;
    /** Fetch cost/token totals before mapping the terminal agent_end; failure degrades to zeros. */
    private finishRun;
    /** No UI here, and an unanswered dialog stalls its tool call, so blocking methods are cancelled. */
    private answerUIRequest;
    /** Emit a terminal error result, then settle and finalize the run. */
    private failRun;
    private settleRun;
    private finalize;
    private pushMessage;
    private emitError;
}
//# sourceMappingURL=OmpRunner.d.ts.map