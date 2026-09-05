/**
 * Shared session environment and MCP config utilities.
 *
 * These helpers DRY up logic that was previously duplicated between
 * ClaudeRunner (query options) and EdgeWorker (warmup / startup).
 */
/**
 * Cyrus-specific env vars injected into every Claude Code subprocess.
 * Both `ClaudeRunner.start()` and `EdgeWorker.warmupRecentSessions()`
 * must use the same set — keep this as the single source of truth.
 *
 * Note: CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is intentionally not included
 * while the Linux bubblewrap sandbox side effects it triggers are being
 * investigated. See CYPACK-1108.
 *
 * - MCP_CONNECTION_NONBLOCKING lets MCP servers connect in the background so
 *   both cold-start and pre-warm sessions return faster.
 */
export declare const CYRUS_SESSION_ENV: {
    readonly CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: "1";
    readonly CLAUDE_CODE_ENABLE_TASKS: "true";
    readonly CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1";
    readonly CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS: "1";
    readonly MCP_CONNECTION_NONBLOCKING: "true";
};
/**
 * Build the base `env` object for a Claude SDK session.
 *
 * Overlays the full parent `process.env` so HOME (and other inherited vars) are
 * available to tools that depend on them — GPG-signed commits, `gh` CLI auth,
 * etc. claude-agent-sdk v0.2.113 reverted to no longer overlaying process.env
 * itself, so we must do it here. Then applies the shared Cyrus session flags
 * on top. Callers can spread additional vars on top (e.g., repository .env
 * for live runs).
 */
export declare function buildBaseSessionEnv(extra?: Record<string, string>): Record<string, string>;
/**
 * Normalize MCP server configs loaded from JSON files.
 *
 * Config files (.mcp.json, mcp-*.json) often omit the `type` field,
 * but the SDK requires an explicit discriminator for non-stdio transports.
 * If a config has a `url` but no `type`, set `type = "http"`.
 *
 * Mutates the input records in place.
 */
export declare function normalizeMcpHttpTransport(servers: Record<string, Record<string, unknown>>): void;
//# sourceMappingURL=session-env.d.ts.map