/**
 * Header name used to identify the team. Extracted as a module-level
 * constant so tests and any future alternate transport stay in sync.
 */
export const CYRUS_TEAM_ID_HEADER = "X-Cyrus-Team-Id";
export class HttpSessionStore {
    baseUrl;
    apiKey;
    teamId;
    fetchImpl;
    logger;
    timeoutMs;
    constructor(opts) {
        if (!opts.baseUrl)
            throw new Error("HttpSessionStore: baseUrl required");
        if (!opts.apiKey)
            throw new Error("HttpSessionStore: apiKey required");
        if (!opts.teamId)
            throw new Error("HttpSessionStore: teamId required");
        // Strip trailing slash so path concat is predictable.
        this.baseUrl = opts.baseUrl.replace(/\/$/, "");
        this.apiKey = opts.apiKey;
        this.teamId = opts.teamId;
        this.fetchImpl = opts.fetch ?? fetch;
        this.logger = opts.logger;
        this.timeoutMs = opts.timeoutMs ?? 15_000;
    }
    async append(key, entries) {
        if (entries.length === 0)
            return;
        await this.post("/api/sessions/append", {
            projectKey: key.projectKey,
            sessionId: key.sessionId,
            ...(key.subpath !== undefined && { subpath: key.subpath }),
            entries,
        });
    }
    async load(key) {
        const res = await this.post("/api/sessions/load", {
            projectKey: key.projectKey,
            sessionId: key.sessionId,
            ...(key.subpath !== undefined && { subpath: key.subpath }),
        });
        // Server returns `entries: null` when no transcript exists. Preserve that
        // distinction — returning `[]` would look like an empty-but-present
        // session, which the SDK treats differently from "no session found".
        return res.entries ?? null;
    }
    async listSessions(projectKey) {
        const res = await this.post("/api/sessions/list-sessions", { projectKey });
        return res.sessions ?? [];
    }
    async delete(key) {
        await this.post("/api/sessions/delete", {
            projectKey: key.projectKey,
            sessionId: key.sessionId,
            ...(key.subpath !== undefined && { subpath: key.subpath }),
        });
    }
    async listSubkeys(key) {
        const res = await this.post("/api/sessions/list-subkeys", {
            projectKey: key.projectKey,
            sessionId: key.sessionId,
        });
        return res.subpaths ?? [];
    }
    /**
     * Builds the headers for every request. Kept as a separate method so the
     * auth scheme can be extended (extra headers, different schemes) by
     * subclassing without rewriting the transport.
     */
    buildRequestHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            [CYRUS_TEAM_ID_HEADER]: this.teamId,
        };
    }
    async post(path, body) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
                method: "POST",
                headers: this.buildRequestHeaders(),
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                const text = await response.text().catch(() => "");
                const err = new Error(`HttpSessionStore ${path} ${response.status}: ${text.slice(0, 500)}`);
                this.logger?.error?.(err.message);
                throw err;
            }
            // Empty bodies (append / delete) are fine — don't blow up on JSON
            // parse if the server omits the body.
            const text = await response.text();
            if (!text)
                return {};
            return JSON.parse(text);
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
//# sourceMappingURL=HttpSessionStore.js.map