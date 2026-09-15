import type { SdkPluginConfig } from "cyrus-claude-runner";
import type { AgentRunnerConfig, CyrusAgentSession, IAgentRunner, ILogger, OpenCodeConfigOverrides, RepositoryConfig, RunnerType } from "cyrus-core";
import type { ChatRepositoryProvider } from "./ChatRepositoryProvider.js";
import type { RunnerConfigBuilder } from "./RunnerConfigBuilder.js";
/**
 * Defines what each chat platform must provide for the generic session lifecycle.
 *
 * Implementations are stateless data mappers — they translate platform-specific
 * events into the common operations the ChatSessionHandler needs.
 */
/** Platform identifiers supported by the session manager */
export type ChatPlatformName = "slack" | "linear" | "github";
export interface ChatPlatformAdapter<TEvent> {
    readonly platformName: ChatPlatformName;
    /** Extract the user's task text from the raw event */
    extractTaskInstructions(event: TEvent): string;
    /**
     * Whether this event is allowed to *start* a brand-new session for its
     * thread. Events that may only continue an already-bound thread (e.g. a
     * plain Slack message that isn't an @mention) return false, so the handler
     * ignores them when no session exists yet.
     *
     * Optional — when omitted, every event is treated as session-initiating
     * (the behaviour for platforms where every event is an explicit invocation).
     */
    isSessionInitiatingEvent?(event: TEvent): boolean;
    /** Derive a unique thread key for session tracking (e.g., "C123:1704110400.000100") */
    getThreadKey(event: TEvent): string;
    /** Get the unique event ID */
    getEventId(event: TEvent): string;
    /** Build a platform-specific system prompt */
    buildSystemPrompt(event: TEvent): string;
    /**
     * Thread context as a formatted string, or "" if not applicable. Pass
     * `sinceTs` to read only what followed it, so a resumed session catches up on
     * discussion it never saw. `null` means the read failed — only a non-null
     * result advances the cursor.
     */
    fetchThreadContext(event: TEvent, sinceTs?: string): Promise<string | null>;
    /**
     * This event's thread position, stored as the catch-up cursor. Optional —
     * platforms that deliver every thread message omit it and get no catch-up.
     */
    getThreadContextTs?(event: TEvent): string | undefined;
    /** Post the agent's final response back to the platform */
    postReply(event: TEvent, runner: IAgentRunner): Promise<void>;
    /** Acknowledge receipt of the event (e.g., emoji reaction). Fire-and-forget */
    acknowledgeReceipt(event: TEvent): Promise<void>;
    /**
     * Acknowledge that the agent finished processing the event (e.g., swap the
     * receipt reaction for a "done" one). Called after the turn completes,
     * whether or not a reply was actually posted — this is what tells users a
     * message was seen even when the agent chose to stay silent.
     *
     * Optional — platforms without a processed indicator omit it. Fire-and-forget.
     */
    acknowledgeProcessed?(event: TEvent): Promise<void>;
    /** Notify the user that a previous request is still processing */
    notifyBusy(event: TEvent, threadKey: string): Promise<void>;
}
/**
 * Callbacks for EdgeWorker integration (same pattern as RepositoryRouterDeps).
 */
export interface ChatSessionHandlerDeps {
    cyrusHome: string;
    /** Provider for live repository paths, default repo, and workspace ID */
    chatRepositoryProvider: ChatRepositoryProvider;
    /** Shared RunnerConfigBuilder for constructing runner configs */
    runnerConfigBuilder: RunnerConfigBuilder;
    /** Factory function that creates the appropriate runner for the chat session */
    createRunner: (config: AgentRunnerConfig, runnerType?: RunnerType) => IAgentRunner;
    /**
     * Live read of the workspace-level custom-integration MCP config paths
     * for the chat platform this handler is bound to (e.g.
     * `config.slackMcpConfigs` for Slack). Chat sessions are repo-agnostic,
     * so `repository.mcpConfigPath` is not consulted; only this list
     * determines which custom `.mcp.json` files load. When empty/omitted,
     * no custom files load (native MCP servers still run as usual).
     */
    getPlatformMcpConfigOverrides?: () => readonly string[] | undefined;
    /** Live read of whether Claude should ignore ambient MCP configuration. */
    getStrictMcpConfig?: () => boolean | undefined;
    /** Resolve managed skill plugins and scoped skill names for a chat session. */
    resolveSkillsConfig?: (input: {
        repository?: RepositoryConfig;
        repositoryPaths: string[];
    }) => Promise<{
        plugins?: SdkPluginConfig[];
        skills?: string[] | "all";
    }>;
    /** Read live global OpenCode config overrides at session-build time */
    getOpenCodeGlobalConfig?: () => OpenCodeConfigOverrides["config"] | undefined;
    /** Read live global OpenCode CLI state scope at session-build time */
    getOpenCodeGlobalStateScope?: () => OpenCodeConfigOverrides["stateScope"] | undefined;
    onWebhookStart: () => void;
    onWebhookEnd: () => void;
    onStateChange: () => Promise<void>;
    onClaudeError: (error: Error) => void;
}
/**
 * Generic session lifecycle engine for chat platform integrations.
 *
 * Manages the create/resume/inject/reply session lifecycle independent of any
 * specific chat platform. Platform-specific behavior is provided via a
 * ChatPlatformAdapter.
 */
export declare class ChatSessionHandler<TEvent> {
    private adapter;
    private sessionManager;
    private threadSessions;
    private deps;
    private logger;
    private pendingReplyEvents;
    private lastReplyEvent;
    private pendingFollowups;
    constructor(adapter: ChatPlatformAdapter<TEvent>, deps: ChatSessionHandlerDeps, logger?: ILogger);
    /**
     * Main entry point — handles a single chat platform event.
     *
     * Replaces the per-platform handleXxxWebhook method in EdgeWorker.
     */
    handleEvent(event: TEvent): Promise<void>;
    /** Returns true if any runner managed by this handler is currently busy */
    isAnyRunnerBusy(): boolean;
    /** Returns all runners managed by this handler (for shutdown) */
    getAllRunners(): IAgentRunner[];
    /**
     * Expose every active chat session this handler owns, so EdgeWorker
     * can resolve a cwd → session bundle from outside (e.g. the
     * `log_failure_mode` MCP tool needs to find a Slack/GitHub chat
     * session's runner session id). Chat sessions live in this handler's
     * dedicated AgentSessionManager — they aren't reachable from
     * EdgeWorker's primary AgentSessionManager.
     */
    getAllChatSessions(): CyrusAgentSession[];
    /**
     * Test/inspection: list all known thread keys and their session IDs.
     * Used by F1 to discover chat sessions for follow-up prompts and replay.
     */
    listThreads(): Array<{
        threadKey: string;
        sessionId: string;
    }>;
    /**
     * Test/inspection: resolve a chat thread to its runner. Returns undefined
     * when the thread is unknown or the runner has been disposed.
     */
    getRunnerForThread(threadKey: string): IAgentRunner | undefined;
    /** Mark how far this session has thread context, for the next catch-up */
    private recordThreadContextTs;
    /**
     * Prefix the task instructions with thread context — the whole thread for a
     * new session, or just what was said since the cursor for a follow-up. The
     * cursor only advances on a successful read, so a failed one retries the same
     * window instead of losing it.
     */
    private withThreadContext;
    /**
     * Follow-up variant. Platforms with no thread cursor deliver every message
     * already, so re-reading the thread would only duplicate what the session has.
     */
    private withThreadCatchup;
    /**
     * Resume an existing session with a new prompt (--continue behavior).
     */
    private resumeSession;
    private getResumeInfo;
    /**
     * Handle agent messages for chat sessions.
     * Routes to the dedicated AgentSessionManager, and posts a reply when the
     * SDK emits a `result` message (signalling turn completion).
     */
    private handleAgentMessage;
    private queuePendingFollowup;
    private threadKeyForSession;
    /**
     * Re-dispatch any follow-ups queued for a thread while it was busy. Runs
     * after the current turn settles (the runner has finalized), so each
     * re-dispatched event takes the normal resume path. Any that still find the
     * runner running re-queue themselves and are drained on the next completion.
     */
    private drainPendingFollowups;
    private enqueueReply;
    private drainReplies;
    /**
     * Discard all queued reply events for a session. Called when the runner
     * rejects before emitting a final `result` — without this, a later
     * resumeSession() on the same sessionId would pair the stale events with
     * the first `result` of the new runner.
     */
    private clearPendingReplies;
    /**
     * Create an empty workspace directory for a chat thread.
     * Unlike repository-associated sessions, chat sessions use plain directories (not git worktrees).
     */
    private createWorkspace;
    /**
     * Build a runner config for a chat session.
     * Delegates to RunnerConfigBuilder for config assembly.
     */
    private buildRunnerConfig;
}
//# sourceMappingURL=ChatSessionHandler.d.ts.map