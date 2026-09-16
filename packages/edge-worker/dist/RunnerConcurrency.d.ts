/**
 * Global concurrency cap for agent runner sessions.
 *
 * Every runner created by the EdgeWorker resolves `start()` /
 * `startStreaming()` only when its session finishes, so holding a semaphore
 * slot for the duration of that promise bounds how many sessions execute at
 * once. Hosts running many webhook-driven sessions use this to keep total
 * runner memory/CPU inside what the machine can serve, instead of letting an
 * unbounded burst of sessions take the whole process down (e.g. via the
 * kernel OOM killer).
 */
import type { IAgentRunner } from "cyrus-core";
/**
 * Counting semaphore with FIFO waiters and a live-adjustable limit.
 *
 * `Number.POSITIVE_INFINITY` means uncapped — `acquire()` resolves
 * immediately. Lowering the limit never interrupts running sessions; it
 * simply stops admitting new ones until enough slots free up.
 */
export declare class SessionSemaphore {
    private limit;
    private readonly onQueued?;
    private activeCount;
    private waiters;
    constructor(limit: number, onQueued?: ((message: string) => void) | undefined);
    get active(): number;
    get waiting(): number;
    get currentLimit(): number;
    acquire(): Promise<void>;
    release(): void;
    /**
     * Adjust the limit at runtime (config hot-reload). Raising it admits
     * queued sessions immediately; lowering it applies as sessions finish.
     */
    setLimit(limit: number): void;
    private admitWaiters;
}
/**
 * Wrap a runner so `start()` and `startStreaming()` hold a semaphore slot for
 * their full duration. Both resolve when the session completes, so the slot
 * is held for the session's lifetime and released on success and failure
 * alike. Follow-up messages streamed into an already-started session
 * (`addStreamMessage`) are untouched — the session already holds its slot.
 *
 * The wrapper is a Proxy rather than an instance mutation: the underlying
 * runner is never modified, every other property forwards through unchanged,
 * and the original methods stay observable (e.g. as test spies).
 */
export declare function capRunnerStarts(runner: IAgentRunner, semaphore: SessionSemaphore): IAgentRunner;
//# sourceMappingURL=RunnerConcurrency.d.ts.map