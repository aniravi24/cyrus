import { EventEmitter } from "node:events";
import type { AppServerClientFactory } from "./appServerClient.js";
import { AppServerProcessManager } from "./appServerProcess.js";
import type { CodexBackend, CodexUserInput, ResolvedCodexConfig } from "./types.js";
/**
 * Backend that drives one Codex app-server thread over the process-wide shared
 * JSON-RPC connection. The app-server process is shared; this class owns only
 * per-thread state and supports injecting input into an active turn via
 * `turn/steer` ({@link supportsSteer} is true).
 */
export declare class AppServerCodexBackend extends EventEmitter implements CodexBackend {
    readonly supportsSteer = true;
    private appServer;
    private threadId;
    private activeTurnId;
    private turnActive;
    private lastUsage;
    /** Structured-output schema for turns, captured at open() for turn/start. */
    private outputSchema;
    /** Resolver for the in-flight {@link runTurn} promise. */
    private turnResolve;
    private turnReject;
    /** Watchdog: fails a turn that goes fully silent for too long. */
    private idleTimer;
    private readonly turnIdleTimeoutMs;
    private readonly processManager;
    private readonly threadHandler;
    /**
     * @param processManagerOrFactory Overridable shared process manager. Tests may
     * still pass the older client factory shape; it is wrapped in an isolated
     * manager for compatibility.
     * @param options.turnIdleTimeoutMs Fail an in-flight turn if the app-server
     * emits no notifications for this long (default 5min; Codex streams
     * continuously, so prolonged silence means a wedged turn). 0 disables it.
     * @param options.requestTimeoutMs Forwarded when wrapping a test client factory.
     */
    constructor(processManagerOrFactory?: AppServerProcessManager | AppServerClientFactory, options?: {
        turnIdleTimeoutMs?: number;
        requestTimeoutMs?: number;
    });
    open(config: ResolvedCodexConfig): Promise<{
        threadId: string;
    }>;
    runTurn(input: CodexUserInput[]): Promise<void>;
    steer(input: CodexUserInput[]): Promise<void>;
    isTurnActive(): boolean;
    interrupt(): Promise<void>;
    close(): Promise<void>;
    private startThread;
    private resumeThread;
    private threadOptionsParams;
    /**
     * Build the free-form Codex `config` for thread/start. The app-server has no
     * `--add-dir` flag, so:
     * - `workspace-mode`: writable roots + network ride on `sandbox_workspace_write`
     *   (only meaningful in workspace-write mode; omitted otherwise).
     * - `profile`: the granular permission profile body is registered under
     *   `permissions.<id>` and selected via the `permissions` thread param.
     * MCP servers etc. ride along in configOverrides.
     */
    private buildThreadConfig;
    private toProtocolInput;
    private onNotification;
    private onTurnCompleted;
    private readUsage;
    private onProcessGone;
    private onProcessError;
    /** Resolve or reject the in-flight runTurn promise exactly once. */
    private settleTurn;
    /** (Re)start the idle watchdog for the current turn. */
    private armIdleWatchdog;
    private clearIdleWatchdog;
}
//# sourceMappingURL=AppServerCodexBackend.d.ts.map