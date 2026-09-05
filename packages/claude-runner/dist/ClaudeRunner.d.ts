import { EventEmitter } from "node:events";
import { type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentPendingWork } from "cyrus-core";
import { type IAgentRunner } from "cyrus-core";
import { type IMessageFormatter } from "./formatter.js";
import type { ClaudeRunnerConfig, ClaudeRunnerEvents, ClaudeSessionInfo } from "./types.js";
export declare class AbortError extends Error {
    constructor(message?: string);
}
export declare interface ClaudeRunner {
    on<K extends keyof ClaudeRunnerEvents>(event: K, listener: ClaudeRunnerEvents[K]): this;
    emit<K extends keyof ClaudeRunnerEvents>(event: K, ...args: Parameters<ClaudeRunnerEvents[K]>): boolean;
}
/** Sessions waiting on a slot. Exposed so callers can report queue depth. */
export declare function getQueuedSessionCount(): number;
export declare class ClaudeRunner extends EventEmitter implements IAgentRunner {
    /**
     * ClaudeRunner supports streaming input via startStreaming(), addStreamMessage(), and completeStream()
     */
    readonly supportsStreamingInput = true;
    private config;
    private logger;
    private abortController;
    private sessionInfo;
    private logStream;
    private readableLogStream;
    private messages;
    private streamingPrompt;
    private activeQuery;
    private cyrusHome;
    private formatter;
    private pendingResultMessage;
    private canUseToolCallback;
    private repositoryEnv;
    private keepSessionWarm;
    private pendingSessionCrons;
    private pendingBackgroundTasks;
    constructor(config: ClaudeRunnerConfig, keepSessionWarm?: boolean);
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
     * Interrupt the current turn without killing the session.
     * The session stays warm and can accept new messages.
     *
     * Only safe to call on warm sessions (see {@link isWarm}). Calling
     * `interrupt()` on a non-warm session aborts the underlying request and
     * causes the SDK to emit a "Request was aborted" error. Callers should
     * gate on `isWarm()` and prefer `stop()` for non-warm sessions.
     */
    interrupt(): Promise<void>;
    /**
     * Whether this runner keeps its SDK session warm between turns. Warm
     * sessions can be safely interrupted; non-warm sessions cannot.
     */
    isWarm(): boolean;
    /**
     * Pending work that will wake this session later, as last reported by the
     * SDK's Stop hook. This is the only reliable signal — the message stream
     * (including the `result` message) is identical with and without pending
     * wakeups (verified empirically in the CYPACK-1310 test drive).
     */
    getPendingWork(): AgentPendingWork;
    /**
     * Whether the session has scheduled wakeups/crons or in-flight background
     * tasks that will wake it later.
     */
    hasPendingWork(): boolean;
    /**
     * Merge the caller-provided hooks with an internal Stop hook that records
     * the SDK's pending-work snapshot (`session_crons` + `background_tasks`).
     *
     * The Stop hook is the only place the SDK reports work that will wake the
     * session later (ScheduleWakeup/CronCreate timers, backgrounded tasks);
     * the recorder runs on every stop attempt and overwrites the previous
     * snapshot, so by the time the `result` message reaches the query loop
     * the snapshot is current for that turn (the hook fires before `result`
     * is emitted). The recorder never blocks the stop.
     */
    private buildHooksWithPendingWorkRecorder;
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
     * Load environment variables from repository .env file into an isolated
     * object. The parsed vars are merged only into the child subprocess env,
     * never into the EdgeWorker's own process.env, so different sessions
     * (potentially across different repositories) cannot poison each other.
     * Re-reads the file on every call so updated/removed vars take effect.
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