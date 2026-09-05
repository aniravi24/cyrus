import { EventEmitter } from "node:events";
import type { IAgentRunner, IMessageFormatter, SDKMessage } from "cyrus-core";
import type { OpenCodeRunnerConfig, OpenCodeRunnerEvents, OpenCodeSessionInfo } from "./types.js";
export declare interface OpenCodeRunner {
    on<K extends keyof OpenCodeRunnerEvents>(event: K, listener: OpenCodeRunnerEvents[K]): this;
    emit<K extends keyof OpenCodeRunnerEvents>(event: K, ...args: Parameters<OpenCodeRunnerEvents[K]>): boolean;
}
export declare class OpenCodeRunner extends EventEmitter implements IAgentRunner {
    readonly supportsStreamingInput = false;
    private readonly config;
    private readonly formatter;
    private sessionInfo;
    private messages;
    private process;
    private hasInitMessage;
    private emittedToolUseIds;
    private pendingResultMessage;
    private lastAssistantText;
    private lastUsage;
    private totalCostUsd;
    private startTimestampMs;
    private wasStopped;
    private hasFinalized;
    private stderr;
    private nonJsonStartupOutput;
    constructor(config: OpenCodeRunnerConfig);
    start(prompt: string): Promise<OpenCodeSessionInfo>;
    startStreaming(initialPrompt?: string): Promise<OpenCodeSessionInfo>;
    addStreamMessage(_content: string): void;
    completeStream(): void;
    stop(): void;
    isRunning(): boolean;
    getMessages(): SDKMessage[];
    getFormatter(): IMessageFormatter;
    private resetSessionState;
    private validateModelSelector;
    private buildRuntimeEnv;
    private buildArgs;
    private buildInputPrompt;
    private handleLine;
    private handleEvent;
    private projectToolUse;
    private emitToolMessages;
    private emitAssistantMessage;
    private emitSystemInitMessage;
    private createSuccessResultMessage;
    private createErrorResultMessage;
    private finalizeSession;
    private pushMessage;
    private emitError;
}
//# sourceMappingURL=OpenCodeRunner.d.ts.map