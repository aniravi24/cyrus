import { EventEmitter } from "node:events";
import type { IAgentRunner, IMessageFormatter, SDKMessage } from "cyrus-core";
import type { OmpRunnerConfig, OmpSessionInfo } from "./types.js";
/**
 * Runs a Cyrus session on omp (`omp --mode rpc`) and projects its event stream
 * onto the Claude-SDK messages the edge worker consumes.
 *
 * The tool surface belongs to omp, not to Cyrus: `allowedTools` is not
 * forwarded, so the session keeps omp's full capability set (subagents, eval,
 * browser, lsp). Guard enforcement is the repository's own hooks.
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
    private runSettled;
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
    /**
     * Cyrus ships its workflow skills as SDK plugin directories, which only the
     * Claude runner reads natively. omp discovers them through
     * `skills.customDirectories`, so the plugin roots are written into a config
     * overlay instead of being staged into a provider-specific layout.
     */
    private writeSkillOverlay;
    private handleFrame;
    /**
     * The result message carries the session's cost and token totals, and omp
     * only reports those on request, so the stats round-trip has to complete
     * before the terminal `agent_end` is mapped. A failed or slow stats call
     * degrades to zeroed accounting rather than withholding the result.
     */
    private finishRun;
    /**
     * Headless sessions have no UI, and an unanswered dialog stalls the tool call
     * that raised it, so blocking methods are cancelled and the rest ignored.
     */
    private answerUIRequest;
    private settleRun;
    private finalize;
    private pushMessage;
    private emitError;
}
//# sourceMappingURL=OmpRunner.d.ts.map