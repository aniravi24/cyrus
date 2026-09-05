import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createLogger } from "cyrus-core";
import { AgentSessionManager } from "./AgentSessionManager.js";
/**
 * Generic session lifecycle engine for chat platform integrations.
 *
 * Manages the create/resume/inject/reply session lifecycle independent of any
 * specific chat platform. Platform-specific behavior is provided via a
 * ChatPlatformAdapter.
 */
export class ChatSessionHandler {
    adapter;
    sessionManager;
    threadSessions = new Map();
    deps;
    logger;
    // Queue of events awaiting a reply, keyed by sessionId. Each entry is
    // enqueued when a new prompt (initial/resume/follow-up-inject) is sent to
    // the runner, and the queue is drained when a `result` message arrives on
    // the runner's message stream. This decouples reply posting from
    // `startStreaming()` resolution, which never resolves when warm sessions
    // hold the streaming prompt open across turns.
    //
    // Drained wholesale, NOT one-per-result: messages injected in quick
    // succession get merged by the runner into a single turn (one `result`
    // answering several queued prompts), so a strict FIFO pairing would leave
    // orphaned entries that never get acknowledged — and would pair them with
    // the wrong later turns.
    pendingReplyEvents = new Map();
    // Last event enqueued per session. When a merged turn drained the queue
    // ahead of schedule, a subsequent `result` finds the queue empty — this
    // remembers where to post that turn's reply (all events in a session share
    // one thread, so any recent event addresses it correctly).
    lastReplyEvent = new Map();
    // Follow-up events that arrived while a turn was running and could not be
    // streamed into it (e.g. the exec Codex backend, which has no mid-turn input
    // channel). Keyed by threadKey. Drained when the running turn completes and
    // re-dispatched as a fresh turn, so a follow-up is never silently dropped —
    // honoring the "I'll pick up your new message once I'm done" promise.
    pendingFollowups = new Map();
    constructor(adapter, deps, logger) {
        this.adapter = adapter;
        this.deps = deps;
        this.logger = logger ?? createLogger({ component: "ChatSessionHandler" });
        // Initialize a dedicated AgentSessionManager (not tied to any repository)
        this.sessionManager = new AgentSessionManager(undefined, // No parent session lookup
        undefined);
    }
    /**
     * Main entry point — handles a single chat platform event.
     *
     * Replaces the per-platform handleXxxWebhook method in EdgeWorker.
     */
    async handleEvent(event) {
        this.deps.onWebhookStart();
        try {
            this.logger.info(`Processing ${this.adapter.platformName} webhook: ${this.adapter.getEventId(event)}`);
            // Fire-and-forget acknowledgement (e.g., emoji reaction)
            this.adapter.acknowledgeReceipt(event).catch((err) => {
                this.logger.warn(`Failed to acknowledge ${this.adapter.platformName} event: ${err instanceof Error ? err.message : err}`);
            });
            const taskInstructions = this.adapter.extractTaskInstructions(event);
            const threadKey = this.adapter.getThreadKey(event);
            // Check if there's already an active session for this thread
            const existingSessionId = this.threadSessions.get(threadKey);
            if (existingSessionId) {
                const existingSession = this.sessionManager.getSession(existingSessionId);
                const existingRunner = this.sessionManager.getAgentRunner(existingSessionId);
                if (existingSession && existingRunner?.isRunning()) {
                    // Session is actively running — inject the follow-up via streaming input
                    if (existingRunner.addStreamMessage &&
                        existingRunner.isStreaming?.()) {
                        this.logger.info(`Injecting follow-up prompt into running session ${existingSessionId} (thread ${threadKey})`);
                        this.enqueueReply(existingSessionId, event);
                        existingRunner.addStreamMessage(await this.withThreadCatchup(existingSession, event, taskInstructions));
                    }
                    else {
                        // Runner can't accept mid-turn input (e.g. exec Codex). Queue the
                        // follow-up so it's delivered as a fresh turn once this one ends,
                        // rather than dropped — then tell the user we'll pick it up.
                        this.logger.info(`Session ${existingSessionId} is still running; queuing follow-up for after the turn (thread ${threadKey})`);
                        this.queuePendingFollowup(threadKey, event);
                        await this.adapter.notifyBusy(event, threadKey);
                    }
                    return;
                }
                if (existingSession && existingRunner) {
                    // Session exists but is not running — resume with --continue
                    this.logger.info(`Resuming completed ${this.adapter.platformName} session ${existingSessionId} (thread ${threadKey})`);
                    const resumeInfo = this.getResumeInfo(existingSession);
                    if (resumeInfo) {
                        try {
                            await this.resumeSession(event, existingSession, existingSessionId, resumeInfo.sessionId, resumeInfo.runnerType, taskInstructions);
                        }
                        catch (error) {
                            this.logger.error(`Failed to resume ${this.adapter.platformName} session ${existingSessionId}`, error instanceof Error ? error : new Error(String(error)));
                        }
                        return;
                    }
                }
                // Session exists but runner was lost — fall through to create a new session
                this.logger.info(`Previous session ${existingSessionId} for thread ${threadKey} has no runner, creating new session`);
            }
            // No session exists for this thread. Only events explicitly allowed to
            // start a session may do so — e.g. a Slack @mention. A plain follow-up
            // message in an unbound thread must be ignored, otherwise every message
            // in any channel Cyrus can see would spin up a session.
            if (!existingSessionId &&
                this.adapter.isSessionInitiatingEvent?.(event) === false) {
                this.logger.info(`Ignoring non-initiating ${this.adapter.platformName} event for unbound thread ${threadKey}`);
                return;
            }
            // Create an empty workspace directory for this thread
            const workspace = await this.createWorkspace(threadKey);
            if (!workspace) {
                this.logger.error(`Failed to create workspace for ${this.adapter.platformName} thread ${threadKey}`);
                return;
            }
            this.logger.info(`${this.adapter.platformName} workspace created at: ${workspace.path}`);
            // Create a chat session (not tied to any issue or repository)
            const eventId = this.adapter.getEventId(event);
            const sessionId = `${this.adapter.platformName}-${eventId}`;
            this.sessionManager.createChatSession(sessionId, workspace, this.adapter.platformName);
            const session = this.sessionManager.getSession(sessionId);
            if (!session) {
                this.logger.error(`Failed to create session for ${this.adapter.platformName} webhook ${eventId}`);
                return;
            }
            // Track this thread → session mapping for follow-up messages
            this.threadSessions.set(threadKey, sessionId);
            // Initialize session metadata
            if (!session.metadata) {
                session.metadata = {};
            }
            // Build the system prompt
            const systemPrompt = this.adapter.buildSystemPrompt(event);
            // Build runner config
            const runnerConfig = await this.buildRunnerConfig(session.workspace.path, sessionId, systemPrompt, sessionId);
            const runner = this.deps.createRunner(runnerConfig, runnerConfig
                .runnerType);
            // Store the runner in the session manager
            this.sessionManager.addAgentRunner(sessionId, runner);
            // Save persisted state
            await this.deps.onStateChange();
            // Fetch thread context for threaded mentions
            const userPrompt = await this.withThreadContext(session, event, taskInstructions);
            this.logger.info(`Starting runner for ${this.adapter.platformName} event ${eventId}`);
            // Start in streaming mode if supported (allows follow-up message injection),
            // otherwise fall back to non-streaming start.
            //
            // Reply posting happens from handleAgentMessage() when a `result`
            // message arrives on the runner's stream — we do NOT await turn
            // completion here, because with warm sessions the streaming prompt
            // stays open and the start() promise doesn't resolve until the
            // whole session ends.
            this.enqueueReply(sessionId, event);
            const startPromise = runner.supportsStreamingInput && runner.startStreaming
                ? runner.startStreaming(userPrompt)
                : runner.start(userPrompt);
            startPromise
                .then((sessionInfo) => {
                this.logger.info(`${this.adapter.platformName} session started: ${sessionInfo.sessionId}`);
            })
                .catch((error) => {
                this.logger.error(`${this.adapter.platformName} session error for event ${eventId}`, error instanceof Error ? error : new Error(String(error)));
                // Runner died before emitting a final `result`. Drop any
                // still-queued reply events for this session so a later
                // resumeSession() doesn't pair them with a future turn.
                this.clearPendingReplies(sessionId);
            })
                .finally(() => {
                this.deps.onStateChange().catch((error) => {
                    this.logger.error(`onStateChange failed after ${this.adapter.platformName} session ${sessionId}`, error instanceof Error ? error : new Error(String(error)));
                });
            });
        }
        catch (error) {
            this.logger.error(`Failed to process ${this.adapter.platformName} webhook`, error instanceof Error ? error : new Error(String(error)));
        }
        finally {
            this.deps.onWebhookEnd();
        }
    }
    /** Returns true if any runner managed by this handler is currently busy */
    isAnyRunnerBusy() {
        for (const runner of this.sessionManager.getAllAgentRunners()) {
            if (runner.isRunning()) {
                return true;
            }
        }
        return false;
    }
    /** Returns all runners managed by this handler (for shutdown) */
    getAllRunners() {
        return this.sessionManager.getAllAgentRunners();
    }
    /**
     * Expose every active chat session this handler owns, so EdgeWorker
     * can resolve a cwd → session bundle from outside (e.g. the
     * `log_failure_mode` MCP tool needs to find a Slack/GitHub chat
     * session's runner session id). Chat sessions live in this handler's
     * dedicated AgentSessionManager — they aren't reachable from
     * EdgeWorker's primary AgentSessionManager.
     */
    getAllChatSessions() {
        return this.sessionManager.getAllSessions();
    }
    /**
     * Test/inspection: list all known thread keys and their session IDs.
     * Used by F1 to discover chat sessions for follow-up prompts and replay.
     */
    listThreads() {
        return Array.from(this.threadSessions.entries()).map(([threadKey, sessionId]) => ({ threadKey, sessionId }));
    }
    /**
     * Test/inspection: resolve a chat thread to its runner. Returns undefined
     * when the thread is unknown or the runner has been disposed.
     */
    getRunnerForThread(threadKey) {
        const sessionId = this.threadSessions.get(threadKey);
        if (!sessionId)
            return undefined;
        return this.sessionManager.getAgentRunner(sessionId);
    }
    /** Mark how far this session has thread context, for the next catch-up */
    recordThreadContextTs(session, event) {
        const ts = this.adapter.getThreadContextTs?.(event);
        if (!ts) {
            return;
        }
        if (!session.metadata) {
            session.metadata = {};
        }
        // Concurrent mentions race here; a backwards cursor re-delivers a message.
        // Slack ts is zero-padded, so string ordering is chronological.
        const current = session.metadata.lastContextTs;
        if (current && ts <= current) {
            return;
        }
        session.metadata.lastContextTs = ts;
    }
    /**
     * Prefix the task instructions with thread context — the whole thread for a
     * new session, or just what was said since the cursor for a follow-up. The
     * cursor only advances on a successful read, so a failed one retries the same
     * window instead of losing it.
     */
    async withThreadContext(session, event, taskInstructions) {
        let context;
        try {
            context = await this.adapter.fetchThreadContext(event, session.metadata?.lastContextTs);
        }
        catch (error) {
            // A context read must never cost the user their message
            this.logger.warn(`Failed to fetch thread context for ${this.adapter.platformName} session: ${error instanceof Error ? error.message : String(error)}`);
            return taskInstructions;
        }
        if (context !== null) {
            this.recordThreadContextTs(session, event);
        }
        return context ? `${context}\n\n${taskInstructions}` : taskInstructions;
    }
    /**
     * Follow-up variant. Platforms with no thread cursor deliver every message
     * already, so re-reading the thread would only duplicate what the session has.
     */
    async withThreadCatchup(session, event, taskInstructions) {
        if (!this.adapter.getThreadContextTs) {
            return taskInstructions;
        }
        return this.withThreadContext(session, event, taskInstructions);
    }
    /**
     * Resume an existing session with a new prompt (--continue behavior).
     */
    async resumeSession(event, existingSession, sessionId, resumeSessionId, runnerType, taskInstructions) {
        const systemPrompt = this.adapter.buildSystemPrompt(event);
        const runnerConfig = await this.buildRunnerConfig(existingSession.workspace.path, sessionId, systemPrompt, sessionId, resumeSessionId, runnerType);
        const runner = this.deps.createRunner(runnerConfig, runnerType);
        this.sessionManager.addAgentRunner(sessionId, runner);
        const resumePrompt = await this.withThreadCatchup(existingSession, event, taskInstructions);
        // Reply posting is driven by `result` messages on the runner's stream
        // (see handleAgentMessage). We must not await turn completion here —
        // warm sessions hold the streaming prompt open across turns so the
        // start() promise only resolves when the whole session ends.
        this.enqueueReply(sessionId, event);
        const startPromise = runner.supportsStreamingInput && runner.startStreaming
            ? runner.startStreaming(resumePrompt)
            : runner.start(resumePrompt);
        startPromise
            .then((sessionInfo) => {
            this.logger.info(`${this.adapter.platformName} session resumed: ${sessionInfo.sessionId} (was ${resumeSessionId})`);
        })
            .catch((error) => {
            this.logger.error(`${this.adapter.platformName} resume session error for ${sessionId}`, error instanceof Error ? error : new Error(String(error)));
            this.clearPendingReplies(sessionId);
        });
    }
    getResumeInfo(session) {
        if (session.claudeSessionId) {
            return { sessionId: session.claudeSessionId, runnerType: "claude" };
        }
        if (session.geminiSessionId) {
            return { sessionId: session.geminiSessionId, runnerType: "gemini" };
        }
        if (session.codexSessionId) {
            return { sessionId: session.codexSessionId, runnerType: "codex" };
        }
        if (session.cursorSessionId) {
            return { sessionId: session.cursorSessionId, runnerType: "cursor" };
        }
        if (session.opencodeSessionId) {
            return { sessionId: session.opencodeSessionId, runnerType: "opencode" };
        }
        return undefined;
    }
    /**
     * Handle agent messages for chat sessions.
     * Routes to the dedicated AgentSessionManager, and posts a reply when the
     * SDK emits a `result` message (signalling turn completion).
     */
    async handleAgentMessage(sessionId, message) {
        await this.sessionManager.handleClaudeMessage(sessionId, message);
        if (message.type === "result") {
            // A `result` ends the turn, and the turn has seen every prompt
            // injected so far — drain the whole queue, not just one entry
            // (quick-succession messages get merged into a single turn).
            const events = this.drainReplies(sessionId);
            const runner = this.sessionManager.getAgentRunner(sessionId);
            // Queue already drained by an earlier merged turn? The reply still
            // belongs to this session's thread — post it via the last event.
            const replyEvent = events[0] ?? this.lastReplyEvent.get(sessionId);
            if (replyEvent && runner) {
                try {
                    await this.adapter.postReply(replyEvent, runner);
                }
                catch (error) {
                    this.logger.error(`Failed to post ${this.adapter.platformName} reply for session ${sessionId}`, error instanceof Error ? error : new Error(String(error)));
                }
                // Fire-and-forget processed acknowledgement for every drained
                // event (e.g., swap the receipt reaction) — runs even when
                // postReply stayed silent.
                for (const event of events) {
                    this.adapter.acknowledgeProcessed?.(event).catch((err) => {
                        this.logger.warn(`Failed to acknowledge processed ${this.adapter.platformName} event: ${err instanceof Error ? err.message : err}`);
                    });
                }
            }
            else if (!replyEvent) {
                this.logger.warn(`Received result for session ${sessionId} with no pending reply event — nothing to post`);
            }
            // The turn is done — deliver any follow-ups that arrived while busy.
            this.drainPendingFollowups(sessionId);
        }
    }
    queuePendingFollowup(threadKey, event) {
        const queue = this.pendingFollowups.get(threadKey) ?? [];
        queue.push(event);
        this.pendingFollowups.set(threadKey, queue);
    }
    threadKeyForSession(sessionId) {
        for (const [threadKey, id] of this.threadSessions) {
            if (id === sessionId) {
                return threadKey;
            }
        }
        return undefined;
    }
    /**
     * Re-dispatch any follow-ups queued for a thread while it was busy. Runs
     * after the current turn settles (the runner has finalized), so each
     * re-dispatched event takes the normal resume path. Any that still find the
     * runner running re-queue themselves and are drained on the next completion.
     */
    drainPendingFollowups(sessionId) {
        const threadKey = this.threadKeyForSession(sessionId);
        if (!threadKey) {
            return;
        }
        const queue = this.pendingFollowups.get(threadKey);
        if (!queue || queue.length === 0) {
            return;
        }
        this.pendingFollowups.delete(threadKey);
        // Defer so the just-finished runner has fully transitioned to not-running
        // before the follow-up is re-evaluated (otherwise it would re-queue).
        setImmediate(() => {
            for (const event of queue) {
                this.handleEvent(event).catch((error) => {
                    this.logger.error(`Failed to re-dispatch queued ${this.adapter.platformName} follow-up (thread ${threadKey})`, error instanceof Error ? error : new Error(String(error)));
                });
            }
        });
    }
    enqueueReply(sessionId, event) {
        const queue = this.pendingReplyEvents.get(sessionId) ?? [];
        queue.push(event);
        this.pendingReplyEvents.set(sessionId, queue);
        this.lastReplyEvent.set(sessionId, event);
    }
    drainReplies(sessionId) {
        const queue = this.pendingReplyEvents.get(sessionId);
        if (!queue || queue.length === 0)
            return [];
        this.pendingReplyEvents.delete(sessionId);
        return queue;
    }
    /**
     * Discard all queued reply events for a session. Called when the runner
     * rejects before emitting a final `result` — without this, a later
     * resumeSession() on the same sessionId would pair the stale events with
     * the first `result` of the new runner.
     */
    clearPendingReplies(sessionId) {
        this.lastReplyEvent.delete(sessionId);
        const queue = this.pendingReplyEvents.get(sessionId);
        if (!queue || queue.length === 0)
            return;
        this.logger.warn(`Discarding ${queue.length} pending ${this.adapter.platformName} reply event(s) for session ${sessionId} after runner error`);
        this.pendingReplyEvents.delete(sessionId);
    }
    /**
     * Create an empty workspace directory for a chat thread.
     * Unlike repository-associated sessions, chat sessions use plain directories (not git worktrees).
     */
    async createWorkspace(threadKey) {
        try {
            const sanitizedKey = threadKey.replace(/[^a-zA-Z0-9.-]/g, "_");
            const workspacePath = join(this.deps.cyrusHome, `${this.adapter.platformName}-workspaces`, sanitizedKey);
            await mkdir(workspacePath, { recursive: true });
            return { path: workspacePath, isGitWorktree: false };
        }
        catch (error) {
            this.logger.error(`Failed to create ${this.adapter.platformName} workspace for thread ${threadKey}`, error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }
    /**
     * Build a runner config for a chat session.
     * Delegates to RunnerConfigBuilder for config assembly.
     */
    async buildRunnerConfig(workspacePath, workspaceName, systemPrompt, sessionId, resumeSessionId, runnerType) {
        const sessionLogger = this.logger.withContext({
            sessionId,
            platform: this.adapter.platformName,
        });
        // Read live values from the provider at session-build time
        const provider = this.deps.chatRepositoryProvider;
        const repository = provider.getDefaultRepository();
        const repositoryPaths = provider.getRepositoryPaths();
        const skillsConfig = this.deps.resolveSkillsConfig
            ? await this.deps.resolveSkillsConfig({ repository, repositoryPaths })
            : {};
        return this.deps.runnerConfigBuilder.buildChatConfig({
            workspacePath,
            workspaceName,
            systemPrompt,
            sessionId,
            resumeSessionId,
            runnerType,
            cyrusHome: this.deps.cyrusHome,
            platformName: this.adapter.platformName,
            linearWorkspaceId: provider.getDefaultLinearWorkspaceId(),
            repository,
            repositoryPaths,
            platformMcpConfigOverrides: this.deps.getPlatformMcpConfigOverrides?.(),
            strictMcpConfig: this.deps.getStrictMcpConfig?.(),
            plugins: skillsConfig.plugins,
            skills: skillsConfig.skills,
            opencodeGlobalConfig: this.deps.getOpenCodeGlobalConfig?.(),
            opencodeGlobalStateScope: this.deps.getOpenCodeGlobalStateScope?.(),
            logger: sessionLogger,
            onMessage: (message) => this.handleAgentMessage(sessionId, message),
            onError: (error) => this.deps.onClaudeError(error),
        });
    }
}
//# sourceMappingURL=ChatSessionHandler.js.map