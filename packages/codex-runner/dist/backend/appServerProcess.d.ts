import { type AppServerClientFactory } from "./appServerClient.js";
import type { ResolvedCodexConfig } from "./types.js";
export interface AppServerThreadHandler {
    onNotification(method: string, params: unknown): void;
    onProcessGone(): void;
    onProcessError(error: unknown): void;
}
export interface AppServerProcessLease {
    request<T = unknown>(method: string, params: unknown): Promise<T>;
    registerThread(threadId: string, handler: AppServerThreadHandler): void;
    unregisterThread(threadId: string, handler: AppServerThreadHandler): void;
    release(): void;
}
interface AppServerProcessManagerOptions {
    requestTimeoutMs?: number;
    idleCloseMs?: number;
}
/**
 * Owns Codex app-server processes for this Node process, pooled by launch
 * configuration. Threads that share an identical launch config (command + args
 * + env) reuse one process; threads with a different config get their own,
 * rather than failing. This keeps the startup-cost savings of sharing while
 * supporting heterogeneous concurrent sessions and confining a process crash to
 * the threads that share that exact configuration.
 */
export declare class AppServerProcessManager {
    private readonly clientFactory;
    private readonly processes;
    private readonly requestTimeoutMs;
    private readonly idleCloseMs;
    constructor(clientFactory?: AppServerClientFactory, options?: AppServerProcessManagerOptions);
    acquire(config: ResolvedCodexConfig): Promise<AppServerProcessLease>;
    /** Tear down every pooled process (e.g. on shutdown or in tests). */
    closeAll(): Promise<void>;
}
export declare const defaultAppServerProcessManager: AppServerProcessManager;
export {};
//# sourceMappingURL=appServerProcess.d.ts.map