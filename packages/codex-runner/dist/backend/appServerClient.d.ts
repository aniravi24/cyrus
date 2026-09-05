import { EventEmitter } from "node:events";
/** Handles a server→client notification (no response expected). */
export type NotificationHandler = (method: string, params: unknown) => void;
/** Handles a server→client request; the returned value becomes the response. */
export type ServerRequestHandler = (method: string, params: unknown) => unknown | Promise<unknown>;
export interface AppServerClientOptions {
    binaryPath: string;
    args?: string[];
    env?: Record<string, string>;
    /** Optional logger; defaults to console. */
    logger?: Pick<typeof console, "warn" | "error">;
    /**
     * Per-request timeout in milliseconds for control-plane calls
     * (`initialize`, `thread/*`, `turn/start`, `turn/steer`, `turn/interrupt`).
     * A wedged app-server then rejects the pending request instead of hanging
     * the session forever. Defaults to 60s. Set to 0 to disable.
     */
    requestTimeoutMs?: number;
}
/**
 * The slice of {@link AppServerClient} the backend depends on. Declaring it lets
 * tests inject a fake transport without spawning a process (Dependency
 * Inversion).
 */
export interface IAppServerClient {
    setNotificationHandler(handler: NotificationHandler): void;
    setServerRequestHandler(handler: ServerRequestHandler): void;
    on(event: "exit", listener: (...args: unknown[]) => void): unknown;
    on(event: "error", listener: (...args: unknown[]) => void): unknown;
    on(event: string, listener: (...args: unknown[]) => void): unknown;
    start(): void;
    request<T = unknown>(method: string, params: unknown): Promise<T>;
    close(): Promise<void>;
}
/** Factory used by the backend to create a client; overridable in tests. */
export type AppServerClientFactory = (options: AppServerClientOptions) => IAppServerClient;
/**
 * Minimal JSON-RPC 2.0 client over a `codex app-server` child process speaking
 * newline-delimited JSON on stdio. Single responsibility: framing + request
 * correlation + dispatch of notifications/server-requests. Knows nothing about
 * Codex semantics.
 */
export declare class AppServerClient extends EventEmitter {
    private readonly options;
    private child;
    private rl;
    private nextId;
    private readonly pending;
    private notificationHandler;
    private serverRequestHandler;
    private closed;
    private readonly logger;
    constructor(options: AppServerClientOptions);
    setNotificationHandler(handler: NotificationHandler): void;
    setServerRequestHandler(handler: ServerRequestHandler): void;
    start(): void;
    request<T = unknown>(method: string, params: unknown): Promise<T>;
    /** Clear a pending request's timeout (called when settled). */
    private settlePending;
    notify(method: string, params: unknown): void;
    close(): Promise<void>;
    /**
     * Terminate the child and any grandchildren. On POSIX the child was spawned
     * `detached`, so it leads its own process group; signalling the negative pid
     * reaps the whole group (the Node bin shim + the native codex binary) at
     * once. Falls back to a direct kill if the group is already gone or on
     * Windows (no process groups).
     */
    private terminateChild;
    private write;
    private onLine;
    private handleServerRequest;
    private failAllPending;
}
//# sourceMappingURL=appServerClient.d.ts.map