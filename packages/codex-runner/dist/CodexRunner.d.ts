import { EventEmitter } from "node:events";
import type { IAgentRunner, IMessageFormatter, SDKMessage } from "cyrus-core";
import type { CodexRunnerConfig, CodexRunnerEvents, CodexSessionInfo } from "./types.js";
export declare interface CodexRunner {
    on<K extends keyof CodexRunnerEvents>(event: K, listener: CodexRunnerEvents[K]): this;
    emit<K extends keyof CodexRunnerEvents>(event: K, ...args: Parameters<CodexRunnerEvents[K]>): boolean;
}
/**
 * Adapts Codex to Cyrus's {@link IAgentRunner} contract.
 *
 * The runner is a thin orchestrator: it owns session lifecycle and delegates
 * configuration assembly ({@link CodexConfigBuilder}), skill staging
 * ({@link CodexSkillStager}), event→message mapping ({@link CodexEventMapper}),
 * and transport ({@link CodexBackend}) to dedicated collaborators. Codex is
 * driven exclusively through the app-server backend, which supports mid-turn
 * input injection (`turn/steer`).
 */
export declare class CodexRunner extends EventEmitter implements IAgentRunner {
    readonly supportsStreamingInput = true;
    private readonly config;
    private readonly formatter;
    private readonly skillStager;
    private readonly mapper;
    private sessionInfo;
    private backend;
    private wasStopped;
    /** Set once the turn reaches a terminal state; gates {@link isStreaming}. */
    private turnFinished;
    /**
     * Follow-up messages that arrived before the turn became steerable (during
     * config build / process spawn / thread start). Flushed via `steer` once the
     * turn starts, so a fast follow-up is never lost or wrongly deferred.
     */
    private pendingFollowups;
    constructor(config: CodexRunnerConfig);
    start(prompt: string): Promise<CodexSessionInfo>;
    startStreaming(initialPrompt?: string): Promise<CodexSessionInfo>;
    /**
     * Inject a message mid-session. While a turn is steerable it is sent
     * immediately (`turn/steer`); during the startup window (before the turn
     * begins) it is buffered and flushed once the turn starts. Throws only once
     * the turn has finished, where the caller should resume with a new turn.
     */
    addStreamMessage(content: string): void;
    completeStream(): void;
    isStreaming(): boolean;
    stop(): void;
    isRunning(): boolean;
    getMessages(): SDKMessage[];
    getFormatter(): IMessageFormatter;
    private startWithPrompt;
    private createBackend;
    private handleBackendEvent;
    private steer;
    private flushPendingFollowups;
    private buildMapperContext;
    private finalizeSession;
    private cleanupRuntimeState;
}
//# sourceMappingURL=CodexRunner.d.ts.map