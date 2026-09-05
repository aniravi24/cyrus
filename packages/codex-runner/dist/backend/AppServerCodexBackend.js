import { EventEmitter } from "node:events";
import { translateAppServerItem, } from "./appServerEvents.js";
import { AppServerProcessManager, defaultAppServerProcessManager, } from "./appServerProcess.js";
/**
 * Backend that drives one Codex app-server thread over the process-wide shared
 * JSON-RPC connection. The app-server process is shared; this class owns only
 * per-thread state and supports injecting input into an active turn via
 * `turn/steer` ({@link supportsSteer} is true).
 */
export class AppServerCodexBackend extends EventEmitter {
    supportsSteer = true;
    appServer = null;
    threadId = null;
    activeTurnId = null;
    turnActive = false;
    lastUsage = {
        input_tokens: 0,
        output_tokens: 0,
        cached_input_tokens: 0,
    };
    /** Structured-output schema for turns, captured at open() for turn/start. */
    outputSchema;
    /** Resolver for the in-flight {@link runTurn} promise. */
    turnResolve = null;
    turnReject = null;
    /** Watchdog: fails a turn that goes fully silent for too long. */
    idleTimer = null;
    turnIdleTimeoutMs;
    processManager;
    threadHandler = {
        onNotification: (method, params) => this.onNotification(method, params),
        onProcessGone: () => this.onProcessGone(),
        onProcessError: (error) => this.onProcessError(error),
    };
    /**
     * @param processManagerOrFactory Overridable shared process manager. Tests may
     * still pass the older client factory shape; it is wrapped in an isolated
     * manager for compatibility.
     * @param options.turnIdleTimeoutMs Fail an in-flight turn if the app-server
     * emits no notifications for this long (default 5min; Codex streams
     * continuously, so prolonged silence means a wedged turn). 0 disables it.
     * @param options.requestTimeoutMs Forwarded when wrapping a test client factory.
     */
    constructor(processManagerOrFactory = defaultAppServerProcessManager, options) {
        super();
        this.processManager =
            typeof processManagerOrFactory === "function"
                ? new AppServerProcessManager(processManagerOrFactory, {
                    ...(options?.requestTimeoutMs !== undefined
                        ? { requestTimeoutMs: options.requestTimeoutMs }
                        : {}),
                    idleCloseMs: 0,
                })
                : processManagerOrFactory;
        this.turnIdleTimeoutMs = options?.turnIdleTimeoutMs ?? 300_000;
    }
    async open(config) {
        this.outputSchema = config.outputSchema;
        const appServer = await this.processManager.acquire(config);
        this.appServer = appServer;
        try {
            const threadId = config.resumeSessionId
                ? await this.resumeThread(config)
                : await this.startThread(config);
            this.threadId = threadId;
            appServer.registerThread(threadId, this.threadHandler);
            this.emit("event", { kind: "thread-started", threadId });
            return { threadId };
        }
        catch (error) {
            this.appServer = null;
            appServer.release();
            throw error;
        }
    }
    async runTurn(input) {
        if (!this.appServer || !this.threadId) {
            throw new Error("AppServerCodexBackend.runTurn called before open()");
        }
        const turnPromise = new Promise((resolve, reject) => {
            this.turnResolve = resolve;
            this.turnReject = reject;
        });
        this.turnActive = true;
        this.armIdleWatchdog();
        try {
            const result = await this.appServer.request("turn/start", {
                threadId: this.threadId,
                input: this.toProtocolInput(input),
                ...(this.outputSchema !== undefined
                    ? { outputSchema: this.outputSchema }
                    : {}),
            });
            this.activeTurnId = result?.turn?.id ?? this.activeTurnId;
            // NOTE: the turn is not steerable the instant turn/start returns — the
            // server only accepts turn/steer once it has emitted the `turn/started`
            // notification. The runner is signalled to flush buffered follow-ups
            // from that notification handler, not here.
        }
        catch (error) {
            this.turnActive = false;
            this.turnResolve = null;
            this.turnReject = null;
            throw error;
        }
        await turnPromise;
    }
    async steer(input) {
        if (!this.appServer || !this.threadId) {
            throw new Error("AppServerCodexBackend.steer called before open()");
        }
        if (!this.turnActive || !this.activeTurnId) {
            throw new Error("Cannot steer: no active turn");
        }
        await this.appServer.request("turn/steer", {
            threadId: this.threadId,
            expectedTurnId: this.activeTurnId,
            input: this.toProtocolInput(input),
        });
    }
    isTurnActive() {
        // A turn is steerable only once turn/start has returned its id — during
        // the brief turn/start request itself, turnActive is true but there is no
        // id to target yet.
        return this.turnActive && this.activeTurnId !== null;
    }
    async interrupt() {
        if (!this.appServer || !this.threadId || !this.activeTurnId) {
            return;
        }
        try {
            await this.appServer.request("turn/interrupt", {
                threadId: this.threadId,
                turnId: this.activeTurnId,
            });
        }
        catch {
            // Interrupt is best-effort; the turn may already have ended.
        }
    }
    async close() {
        const appServer = this.appServer;
        const threadId = this.threadId;
        const turnId = this.activeTurnId;
        this.appServer = null;
        this.threadId = null;
        this.activeTurnId = null;
        if (appServer && threadId && turnId) {
            void appServer
                .request("turn/interrupt", { threadId, turnId })
                .catch(() => undefined);
        }
        if (appServer && threadId) {
            appServer.unregisterThread(threadId, this.threadHandler);
        }
        this.settleTurn(new Error("app-server backend closed"));
        appServer?.release();
    }
    // ---- Thread setup -------------------------------------------------------
    async startThread(config) {
        const result = await this.appServer?.request("thread/start", this.threadOptionsParams(config));
        const id = result?.thread?.id;
        if (!id) {
            throw new Error("thread/start did not return a thread id");
        }
        return id;
    }
    async resumeThread(config) {
        const result = await this.appServer?.request("thread/resume", {
            threadId: config.resumeSessionId,
            ...this.threadOptionsParams(config),
        });
        // Resuming returns the same id we asked for; fall back to it defensively.
        return result?.thread?.id ?? config.resumeSessionId ?? "";
    }
    threadOptionsParams(config) {
        const sandbox = config.sandbox;
        // `sandbox` (coarse mode) and `permissions` (named profile) are mutually
        // exclusive on thread/start; pick exactly one based on the resolved arm.
        const sandboxParams = sandbox.kind === "profile"
            ? { permissions: sandbox.profileId }
            : { sandbox: sandbox.mode };
        return {
            ...(config.workingDirectory ? { cwd: config.workingDirectory } : {}),
            approvalPolicy: config.approvalPolicy,
            ...sandboxParams,
            ...(config.model ? { model: config.model } : {}),
            ...(config.developerInstructions
                ? { developerInstructions: config.developerInstructions }
                : {}),
            config: this.buildThreadConfig(config),
        };
    }
    /**
     * Build the free-form Codex `config` for thread/start. The app-server has no
     * `--add-dir` flag, so:
     * - `workspace-mode`: writable roots + network ride on `sandbox_workspace_write`
     *   (only meaningful in workspace-write mode; omitted otherwise).
     * - `profile`: the granular permission profile body is registered under
     *   `permissions.<id>` and selected via the `permissions` thread param.
     * MCP servers etc. ride along in configOverrides.
     */
    buildThreadConfig(config) {
        const base = config.configOverrides
            ? { ...config.configOverrides }
            : {};
        const sandbox = config.sandbox;
        if (sandbox.kind === "profile") {
            base.permissions = {
                [sandbox.profileId]: {
                    filesystem: { ...sandbox.filesystem },
                    network: { enabled: sandbox.networkAccess },
                },
            };
        }
        else if (sandbox.mode === "workspace-write") {
            base.sandbox_workspace_write = {
                network_access: sandbox.networkAccess,
                ...(sandbox.writableRoots.length > 0
                    ? { writable_roots: [...sandbox.writableRoots] }
                    : {}),
            };
        }
        return base;
    }
    toProtocolInput(input) {
        return input.map((item) => item.type === "text"
            ? { type: "text", text: item.text }
            : { type: "localImage", path: item.path });
    }
    // ---- Notification / request handling ------------------------------------
    onNotification(method, params) {
        // Any notification is a sign of life — reset the idle watchdog.
        if (this.turnActive) {
            this.armIdleWatchdog();
        }
        const p = (params ?? {});
        switch (method) {
            case "turn/started": {
                // The server now accepts turn/steer for this turn. Capture the id
                // (defensively) and signal the runner to flush buffered follow-ups.
                const turn = p.turn;
                if (turn?.id) {
                    this.activeTurnId = turn.id;
                }
                this.emit("event", { kind: "turn-started" });
                break;
            }
            case "item/started": {
                const item = translateAppServerItem(p.item);
                if (item)
                    this.emit("event", { kind: "item-started", item });
                break;
            }
            case "item/completed": {
                const item = translateAppServerItem(p.item);
                if (item)
                    this.emit("event", { kind: "item-completed", item });
                break;
            }
            case "thread/tokenUsage/updated": {
                this.lastUsage = this.readUsage(p);
                break;
            }
            case "turn/completed": {
                this.onTurnCompleted(p);
                break;
            }
            default:
                // Other notifications (rate limits, mcp startup, warnings, deltas)
                // are not needed for the current activity mapping.
                break;
        }
    }
    onTurnCompleted(params) {
        const turn = (params.turn ?? {});
        this.turnActive = false;
        this.activeTurnId = null;
        if (turn.status === "failed") {
            const message = turn.error?.message || "Codex turn failed";
            this.emit("event", { kind: "turn-failed", message });
        }
        else {
            this.emit("event", { kind: "turn-completed", usage: this.lastUsage });
        }
        this.settleTurn();
    }
    readUsage(params) {
        const total = (params.tokenUsage?.total ?? {});
        return {
            input_tokens: numberOr(total.inputTokens, this.lastUsage.input_tokens),
            output_tokens: numberOr(total.outputTokens, this.lastUsage.output_tokens),
            cached_input_tokens: numberOr(total.cachedInputTokens, this.lastUsage.cached_input_tokens),
        };
    }
    onProcessGone() {
        if (this.turnActive) {
            this.emit("event", {
                kind: "turn-failed",
                message: "codex app-server exited before the turn completed",
            });
        }
        this.settleTurn();
    }
    onProcessError(err) {
        const message = err instanceof Error ? err.message : String(err);
        this.emit("event", { kind: "error", message });
    }
    /** Resolve or reject the in-flight runTurn promise exactly once. */
    settleTurn(error) {
        this.clearIdleWatchdog();
        const resolve = this.turnResolve;
        const reject = this.turnReject;
        this.turnResolve = null;
        this.turnReject = null;
        this.turnActive = false;
        if (error && reject) {
            reject(error);
        }
        else if (resolve) {
            resolve();
        }
    }
    /** (Re)start the idle watchdog for the current turn. */
    armIdleWatchdog() {
        if (this.turnIdleTimeoutMs <= 0) {
            return;
        }
        this.clearIdleWatchdog();
        this.idleTimer = setTimeout(() => {
            if (!this.turnActive) {
                return;
            }
            this.emit("event", {
                kind: "turn-failed",
                message: `codex app-server produced no activity for ${this.turnIdleTimeoutMs}ms`,
            });
            this.settleTurn();
        }, this.turnIdleTimeoutMs);
        this.idleTimer.unref?.();
    }
    clearIdleWatchdog() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
}
function numberOr(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
//# sourceMappingURL=AppServerCodexBackend.js.map