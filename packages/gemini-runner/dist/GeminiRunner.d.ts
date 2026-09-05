import { EventEmitter } from "node:events";
import { type IAgentRunner, type IMessageFormatter, type SDKAssistantMessage, type SDKMessage } from "cyrus-core";
import type { GeminiRunnerConfig, GeminiRunnerEvents, GeminiSessionInfo } from "./types.js";
export declare interface GeminiRunner {
    on<K extends keyof GeminiRunnerEvents>(event: K, listener: GeminiRunnerEvents[K]): this;
    emit<K extends keyof GeminiRunnerEvents>(event: K, ...args: Parameters<GeminiRunnerEvents[K]>): boolean;
}
/**
 * Manages Gemini CLI sessions and communication
 *
 * GeminiRunner implements the IAgentRunner interface to provide a provider-agnostic
 * wrapper around the Gemini CLI. It spawns the Gemini CLI process in headless mode
 * and translates between the CLI's JSON streaming format and Claude SDK message types.
 *
 * @example
 * ```typescript
 * const runner = new GeminiRunner({
 *   cyrusHome: '/home/user/.cyrus',
 *   workingDirectory: '/path/to/repo',
 *   model: 'gemini-2.5-flash',
 *   autoApprove: true
 * });
 *
 * // String mode
 * await runner.start("Analyze this codebase");
 *
 * // Streaming mode
 * await runner.startStreaming("Initial task");
 * runner.addStreamMessage("Additional context");
 * runner.completeStream();
 * ```
 */
export declare class GeminiRunner extends EventEmitter implements IAgentRunner {
    /**
     * GeminiRunner does not support true streaming input.
     * While startStreaming() exists, it only accepts an initial prompt and does not support
     * addStreamMessage() for adding messages after the session starts.
     */
    readonly supportsStreamingInput = false;
    private config;
    private process;
    private sessionInfo;
    private logStream;
    private readableLogStream;
    private messages;
    private streamingPrompt;
    private cyrusHome;
    private accumulatingMessage;
    private accumulatingRole;
    private lastAssistantMessage;
    private settingsCleanup;
    private systemPromptManager;
    private formatter;
    private readlineInterface;
    private pendingResultMessage;
    constructor(config: GeminiRunnerConfig);
    /**
     * Start a new Gemini session with string prompt (legacy mode)
     */
    start(prompt: string): Promise<GeminiSessionInfo>;
    /**
     * Start a new Gemini session with streaming input
     */
    startStreaming(initialPrompt?: string): Promise<GeminiSessionInfo>;
    /**
     * Add a message to the streaming prompt (only works when in streaming mode)
     */
    addStreamMessage(content: string): void;
    /**
     * Complete the streaming prompt (no more messages will be added)
     */
    completeStream(): void;
    /**
     * Get the last assistant message (used for result coercion)
     */
    getLastAssistantMessage(): SDKAssistantMessage | null;
    /**
     * Internal method to start a Gemini session with either string or streaming prompt
     */
    private startWithPrompt;
    /**
     * Process a Gemini stream event and convert to SDK message
     */
    private processStreamEvent;
    /**
     * Accumulate a delta message (message with delta: true)
     */
    private accumulateDeltaMessage;
    /**
     * Flush the accumulated delta message
     */
    private flushAccumulatedMessage;
    /**
     * Emit a message (add to messages array, log, and emit event)
     */
    private emitMessage;
    /**
     * Stop the current Gemini session
     */
    stop(): void;
    /**
     * Check if the session is currently running
     */
    isRunning(): boolean;
    /**
     * Get all messages from the current session
     */
    getMessages(): SDKMessage[];
    /**
     * Get the message formatter for this runner
     */
    getFormatter(): IMessageFormatter;
    /**
     * Build MCP servers configuration from config paths and inline config
     *
     * MCP configuration loading follows a layered approach:
     * 1. Auto-detect .mcp.json in working directory (base config)
     * 2. Load from explicitly configured paths via mcpConfigPath (extends/overrides)
     * 3. Merge inline mcpConfig (highest priority, overrides file configs)
     *
     * HTTP-based MCP servers (like Linear's https://mcp.linear.app/mcp) are filtered out
     * since Gemini CLI only supports stdio (command-based) MCP servers.
     *
     * @returns Record of MCP server name to GeminiMcpServerConfig
     */
    private buildMcpServers;
    /**
     * Set up logging streams for this session
     */
    private setupLogging;
    /**
     * Write a human-readable log entry for a message
     */
    private writeReadableLogEntry;
}
//# sourceMappingURL=GeminiRunner.d.ts.map