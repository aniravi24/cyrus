import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import readline from "node:readline";
/** Default control-plane request timeout. Turn execution is awaited separately
 * (via notifications), so this only bounds quick request/response calls. */
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
/**
 * Minimal JSON-RPC 2.0 client over a `codex app-server` child process speaking
 * newline-delimited JSON on stdio. Single responsibility: framing + request
 * correlation + dispatch of notifications/server-requests. Knows nothing about
 * Codex semantics.
 */
export class AppServerClient extends EventEmitter {
    options;
    child = null;
    rl = null;
    nextId = 1;
    pending = new Map();
    notificationHandler = null;
    serverRequestHandler = null;
    closed = false;
    logger;
    constructor(options) {
        super();
        this.options = options;
        this.logger = options.logger ?? console;
    }
    setNotificationHandler(handler) {
        this.notificationHandler = handler;
    }
    setServerRequestHandler(handler) {
        this.serverRequestHandler = handler;
    }
    start() {
        if (this.child) {
            throw new Error("AppServerClient already started");
        }
        const args = this.options.args ?? ["app-server", "--listen", "stdio://"];
        const child = spawn(this.options.binaryPath, args, {
            stdio: ["pipe", "pipe", "pipe"],
            // Run in its own process group (POSIX) so teardown can signal the whole
            // tree at once. We launch codex via the `@openai/codex` Node bin shim,
            // which spawns the native binary as a grandchild; killing only the shim
            // would leave the native process to linger until its stdin pipe closes.
            // Group-killing reaps both immediately. Not supported on Windows.
            ...(process.platform !== "win32" ? { detached: true } : {}),
            ...(this.options.env ? { env: this.options.env } : {}),
        });
        this.child = child;
        child.once("error", (err) => {
            this.failAllPending(err);
            this.emit("error", err);
        });
        child.once("exit", (code, signal) => {
            this.closed = true;
            const reason = new Error(`codex app-server exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
            this.failAllPending(reason);
            this.emit("exit", code, signal);
        });
        child.stderr.on("data", (data) => {
            const text = data.toString().trim();
            if (text) {
                this.emit("stderr", text);
            }
        });
        this.rl = readline.createInterface({
            input: child.stdout,
            crlfDelay: Number.POSITIVE_INFINITY,
        });
        this.rl.on("line", (line) => this.onLine(line));
    }
    request(method, params) {
        if (this.closed || !this.child) {
            return Promise.reject(new Error(`Cannot send ${method}: app-server is not running`));
        }
        const id = this.nextId++;
        const message = { jsonrpc: "2.0", id, method, params };
        const timeoutMs = this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
        return new Promise((resolve, reject) => {
            const entry = {
                resolve: resolve,
                reject,
                method,
            };
            if (timeoutMs > 0) {
                entry.timer = setTimeout(() => {
                    if (this.pending.delete(id)) {
                        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
                    }
                }, timeoutMs);
                // Don't keep the event loop alive solely for this timer.
                entry.timer.unref?.();
            }
            this.pending.set(id, entry);
            this.write(message);
        });
    }
    /** Clear a pending request's timeout (called when settled). */
    settlePending(id) {
        const entry = this.pending.get(id);
        if (entry) {
            this.pending.delete(id);
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
        }
        return entry;
    }
    notify(method, params) {
        if (this.closed || !this.child) {
            return;
        }
        this.write({ jsonrpc: "2.0", method, params });
    }
    async close() {
        this.closed = true;
        this.rl?.close();
        this.rl = null;
        const child = this.child;
        this.child = null;
        if (child && !child.killed) {
            this.terminateChild(child);
        }
        this.failAllPending(new Error("app-server client closed"));
    }
    /**
     * Terminate the child and any grandchildren. On POSIX the child was spawned
     * `detached`, so it leads its own process group; signalling the negative pid
     * reaps the whole group (the Node bin shim + the native codex binary) at
     * once. Falls back to a direct kill if the group is already gone or on
     * Windows (no process groups).
     */
    terminateChild(child) {
        try {
            if (process.platform !== "win32" && typeof child.pid === "number") {
                process.kill(-child.pid, "SIGTERM");
                return;
            }
        }
        catch {
            // Group already dead or unavailable — fall through to a direct kill.
        }
        try {
            child.kill();
        }
        catch {
            // best-effort
        }
    }
    write(message) {
        try {
            this.child?.stdin.write(`${JSON.stringify(message)}\n`);
        }
        catch (err) {
            this.logger.error("[AppServerClient] write failed", err);
        }
    }
    onLine(line) {
        const trimmed = line.trim();
        if (!trimmed) {
            return;
        }
        let message;
        try {
            message = JSON.parse(trimmed);
        }
        catch {
            this.logger.warn(`[AppServerClient] non-JSON line: ${trimmed.slice(0, 200)}`);
            return;
        }
        // Response to a client request.
        if (message.id !== undefined &&
            (message.result !== undefined || message.error !== undefined)) {
            const entry = this.settlePending(message.id);
            if (!entry) {
                return;
            }
            if (message.error) {
                entry.reject(new Error(`${entry.method} failed: ${message.error.message ?? "unknown error"}`));
            }
            else {
                entry.resolve(message.result);
            }
            return;
        }
        // Server→client request (expects a response).
        if (message.id !== undefined && message.method) {
            void this.handleServerRequest(message.id, message.method, message.params);
            return;
        }
        // Notification.
        if (message.method) {
            try {
                this.notificationHandler?.(message.method, message.params);
            }
            catch (err) {
                this.logger.error(`[AppServerClient] notification handler threw for ${message.method}`, err);
            }
        }
    }
    async handleServerRequest(id, method, params) {
        let result = {};
        try {
            if (this.serverRequestHandler) {
                result = (await this.serverRequestHandler(method, params)) ?? {};
            }
        }
        catch (err) {
            this.logger.error(`[AppServerClient] server-request handler threw for ${method}`, err);
        }
        this.write({ jsonrpc: "2.0", id, result });
    }
    failAllPending(reason) {
        for (const [, entry] of this.pending) {
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            entry.reject(reason);
        }
        this.pending.clear();
    }
}
//# sourceMappingURL=appServerClient.js.map