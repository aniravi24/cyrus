import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import type {
	OmpChunkFrame,
	OmpFrame,
	OmpReadyFrame,
	OmpResponseFrame,
} from "./types.js";

const FORCE_KILL_DELAY_MS = 5_000;

/**
 * Wire boundary: omp's stdout is trusted to be JSONL objects carrying a string
 * `type`, which is checked here. The assertion narrows that checked shape to the
 * frame union; unmodeled frame types fall through every consumer's default arm.
 */
function parseFrame(line: string): OmpFrame | null {
	let value: unknown;
	try {
		value = JSON.parse(line);
	} catch {
		return null;
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	if (!("type" in value) || typeof value.type !== "string") return null;
	const frame = value as OmpFrame;
	return frame;
}

export interface OmpRpcProcessOptions {
	ompPath: string;
	args: string[];
	cwd: string;
	env: Record<string, string | undefined>;
}

interface ChunkAccumulator {
	chunkId: string;
	count: number;
	byteLength: number;
	parts: Buffer[];
	next: number;
}

/**
 * Owns one `omp --mode rpc` child: JSONL framing, protocol-v2 chunk
 * reassembly, and id-correlated command dispatch.
 *
 * Emits `frame` for every reassembled stdout object and `exit` once.
 */
export class OmpRpcProcess extends EventEmitter {
	private child: ChildProcessWithoutNullStreams | null = null;
	private stdoutBuffer = "";
	private stderrTail: string[] = [];
	private nextRequestId = 0;
	private pending = new Map<
		string,
		{
			resolve: (frame: OmpResponseFrame) => void;
			reject: (error: Error) => void;
		}
	>();
	private chunks: ChunkAccumulator | null = null;
	private maxReassembledBytes = 0;
	private exited = false;

	constructor(private readonly options: OmpRpcProcessOptions) {
		super();
	}

	/**
	 * Spawns omp and resolves on its `ready` frame, after negotiating protocol
	 * v2 when advertised. V1 truncates any stdout object above 1 MiB, which a
	 * large tool result reaches easily, so the negotiation is not optional.
	 */
	async start(readyTimeoutMs = 30_000): Promise<OmpReadyFrame> {
		const child = spawn(this.options.ompPath, this.options.args, {
			cwd: this.options.cwd,
			env: this.options.env as NodeJS.ProcessEnv,
			stdio: ["pipe", "pipe", "pipe"],
		});
		this.child = child;

		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => this.consumeStdout(chunk));
		child.stderr.setEncoding("utf8");
		child.stderr.on("data", (chunk: string) => {
			this.stderrTail.push(chunk);
			if (this.stderrTail.length > 50) this.stderrTail.shift();
		});
		child.on("error", (error) => this.emit("processError", error));
		child.on("exit", (code, signal) => {
			this.exited = true;
			for (const [, waiter] of this.pending) {
				waiter.reject(new Error("omp exited before responding"));
			}
			this.pending.clear();
			this.emit("exit", { code, signal, stderr: this.stderrTail.join("") });
		});

		const ready = await new Promise<OmpReadyFrame>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(
					new Error(
						`omp did not emit a ready frame within ${readyTimeoutMs}ms: ${this.stderrTail.join("").slice(-500)}`,
					),
				);
			}, readyTimeoutMs);
			const onFrame = (frame: OmpFrame) => {
				if (frame.type !== "ready") return;
				clearTimeout(timer);
				this.off("frame", onFrame);
				resolve(frame);
			};
			this.on("frame", onFrame);
		});

		this.maxReassembledBytes = ready.maxReassembledFrameBytes ?? 0;
		if (ready.supportedProtocolVersions?.includes(2)) {
			await this.command({ type: "negotiate_protocol", protocolVersion: 2 });
		}
		return ready;
	}

	/** Fire-and-forget frame (no id correlation). */
	notify(frame: Record<string, unknown>): void {
		this.write(frame);
	}

	/** Sends a command and resolves with its correlated response frame. */
	async command(
		frame: Record<string, unknown>,
		timeoutMs = 60_000,
	): Promise<OmpResponseFrame> {
		if (!this.child || this.exited)
			throw new Error("omp process is not running");
		const id = `cyrus_${++this.nextRequestId}`;
		const response = new Promise<OmpResponseFrame>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`omp command ${String(frame.type)} timed out`));
			}, timeoutMs);
			this.pending.set(id, {
				resolve: (value) => {
					clearTimeout(timer);
					resolve(value);
				},
				reject: (error) => {
					clearTimeout(timer);
					reject(error);
				},
			});
		});
		this.write({ ...frame, id });
		return response;
	}

	isRunning(): boolean {
		return this.child !== null && !this.exited;
	}

	/** Closes stdin so omp drains and exits, then hard-kills if it lingers. */
	stop(): void {
		const child = this.child;
		if (!child || this.exited) return;
		try {
			child.stdin.end();
		} catch {
			// stdin already closed; fall through to the kill path.
		}
		child.kill("SIGTERM");
		setTimeout(() => {
			if (!this.exited) child.kill("SIGKILL");
		}, FORCE_KILL_DELAY_MS).unref();
	}

	private write(frame: Record<string, unknown>): void {
		if (!this.child || this.exited)
			throw new Error("omp process is not running");
		this.child.stdin.write(`${JSON.stringify(frame)}\n`);
	}

	private consumeStdout(chunk: string): void {
		this.stdoutBuffer += chunk;
		const lines = this.stdoutBuffer.split("\n");
		this.stdoutBuffer = lines.pop() ?? "";
		for (const line of lines) {
			if (!line.trim()) continue;
			const frame = parseFrame(line);
			if (!frame) continue;
			if (frame.type === "rpc_chunk") {
				const reassembled = this.absorbChunk(frame);
				if (reassembled) this.dispatch(reassembled);
				continue;
			}
			this.dispatch(frame);
		}
	}

	/**
	 * Accumulates a v2 chunk sequence. The protocol requires rejecting
	 * interleaved or out-of-order sequences rather than stitching them, so a
	 * mismatch drops the whole sequence instead of yielding a corrupt object.
	 */
	private absorbChunk(frame: OmpChunkFrame): OmpFrame | null {
		const { byteLength, chunkId, count, data, index } = frame;

		if (index === 0) {
			this.chunks = { chunkId, count, byteLength, parts: [], next: 0 };
		}
		const acc = this.chunks;
		if (!acc || acc.chunkId !== chunkId || acc.next !== index) {
			this.chunks = null;
			this.emit(
				"processError",
				new Error(`discarded interrupted omp chunk sequence ${chunkId}`),
			);
			return null;
		}
		if (this.maxReassembledBytes > 0 && byteLength > this.maxReassembledBytes) {
			this.chunks = null;
			this.emit(
				"processError",
				new Error(`omp frame ${chunkId} exceeds the reassembly limit`),
			);
			return null;
		}

		acc.parts.push(Buffer.from(data, "base64"));
		acc.next += 1;
		if (acc.next < acc.count) return null;

		this.chunks = null;
		const payload = Buffer.concat(acc.parts);
		if (payload.byteLength !== acc.byteLength) {
			this.emit(
				"processError",
				new Error(`omp frame ${chunkId} byte length mismatch`),
			);
			return null;
		}
		const reassembled = parseFrame(payload.toString("utf8"));
		if (reassembled) return reassembled;
		this.emit(
			"processError",
			new Error(`omp frame ${chunkId} did not reassemble into one JSON object`),
		);
		return null;
	}

	private dispatch(frame: OmpFrame): void {
		if (frame.type === "response") {
			const waiter = frame.id ? this.pending.get(frame.id) : undefined;
			if (waiter && frame.id) {
				this.pending.delete(frame.id);
				waiter.resolve(frame);
			}
		}
		this.emit("frame", frame);
	}
}
