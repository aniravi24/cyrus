import { EventEmitter } from "node:events";
import type { OmpReadyFrame, OmpResponseFrame, OmpRpcProcessOptions } from "./types.js";
/**
 * Owns one `omp --mode rpc` child: JSONL framing, protocol-v2 chunk
 * reassembly, and id-correlated command dispatch.
 *
 * Emits `frame` for every reassembled stdout object and `exit` once.
 */
export declare class OmpRpcProcess extends EventEmitter {
    private readonly options;
    private child;
    private stdoutBuffer;
    private stderrTail;
    private nextRequestId;
    private pending;
    private chunks;
    private maxReassembledBytes;
    private exited;
    constructor(options: OmpRpcProcessOptions);
    /**
     * Spawns omp and resolves on its `ready` frame, after negotiating protocol
     * v2 when advertised. V1 truncates any stdout object above 1 MiB, which a
     * large tool result reaches easily, so the negotiation is not optional.
     */
    start(readyTimeoutMs?: number): Promise<OmpReadyFrame>;
    /** Fire-and-forget frame (no id correlation). */
    notify(frame: Record<string, unknown>): void;
    /** Sends a command and resolves with its correlated response frame. */
    command(frame: Record<string, unknown>, timeoutMs?: number): Promise<OmpResponseFrame>;
    isRunning(): boolean;
    /** Closes stdin so omp drains and exits, then hard-kills if it lingers. */
    stop(): void;
    private write;
    private consumeStdout;
    /**
     * Accumulates a v2 chunk sequence. The protocol requires rejecting
     * interleaved or out-of-order sequences rather than stitching them, so a
     * mismatch drops the whole sequence instead of yielding a corrupt object.
     */
    private absorbChunk;
    private dispatch;
}
//# sourceMappingURL=OmpRpcProcess.d.ts.map