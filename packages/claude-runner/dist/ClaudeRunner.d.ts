import { EventEmitter } from "node:events";
import { type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { type IAgentRunner } from "cyrus-core";
export declare class AbortError extends Error {
    constructor(message?: string);
}
import { type IMessageFormatter } from "./formatter.js";
import type { ClaudeRunnerConfig, ClaudeRunnerEvents, ClaudeSessionInfo } from "./types.js";
export declare interface ClaudeRunner {
    on<K extends keyof ClaudeRunnerEvents>(event: K, listener: ClaudeRunnerEvents[K]): this;
    emit<K extends keyof ClaudeRunnerEvents>(event: K, ...args: Parameters<ClaudeRunnerEvents[K]>): boolean;
}
/**
 * Manages Claude SDK sessions and communication
 */
export declare class ClaudeRunner extends EventEmitter implements IAgentRunner {
    /**
     * ClaudeRunner supports streaming input via startStreaming(), addStreamMessage(), and completeStream()
     */
    readonly supportsStreamingInput = true;
    private config;
    private abortController;
    private sessionInfo;
    private logStream;
    private readableLogStream;
    private messages;
    private streamingPrompt;
    private cyrusHome;
    private formatter;
    private pendingResultMessage;
    private canUseToolCallback;
    constructor(config: ClaudeRunnerConfig);
    /**
     * Create the canUseTool callback for intercepting AskUserQuestion tool calls.
     *
     * This implements the Claude SDK permission handling pattern:
     * - Intercepts AskUserQuestion tool calls
     * - Rejects requests with multiple questions (only 1 allowed at a time)
     * - Delegates to the onAskUserQuestion callback for presentation
     * - Returns the user's answers or denial
     *
     * @see {@link https://platform.claude.com/docs/en/agent-sdk/permissions#handling-the-ask-user-question-tool}
     */
    private createCanUseToolCallback;
    /**
     * Start a new Claude session with string prompt (legacy mode)
     */
    start(prompt: string): Promise<ClaudeSessionInfo>;
    /**
     * Start a new Claude session with streaming input
     */
    startStreaming(initialPrompt?: string): Promise<ClaudeSessionInfo>;
    /**
     * Add a message to the streaming prompt (only works when in streaming mode)
     */
    addStreamMessage(content: string): void;
    /**
     * Complete the streaming prompt (no more messages will be added)
     */
    completeStream(): void;
    /**
     * Internal method to start a Claude session with either string or streaming prompt
     */
    private startWithPrompt;
    /**
     * Update prompt versions (can be called after constructor)
     */
    updatePromptVersions(versions: {
        userPromptVersion?: string;
        systemPromptVersion?: string;
    }): void;
    /**
     * Stop the current Claude session
     */
    stop(): void;
    /**
     * Check if session is running
     */
    isRunning(): boolean;
    /**
     * Check if session is in streaming mode and still running
     */
    isStreaming(): boolean;
    /**
     * Get current session info
     */
    getSessionInfo(): ClaudeSessionInfo | null;
    /**
     * Get all messages from current session
     */
    getMessages(): SDKMessage[];
    /**
     * Get the message formatter for this runner
     */
    getFormatter(): IMessageFormatter;
    /**
     * Process individual SDK messages and emit appropriate events
     */
    private processMessage;
    /**
     * Load environment variables from repository .env file
     * Does not override existing process.env values
     */
    private loadRepositoryEnv;
    /**
     * Set up logging to .cyrus directory
     */
    private setupLogging;
    /**
     * Write a human-readable log entry for a message
     */
    private writeReadableLogEntry;
}
//# sourceMappingURL=ClaudeRunner.d.ts.map