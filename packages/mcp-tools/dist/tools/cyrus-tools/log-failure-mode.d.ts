import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/**
 * Rich session context resolved from a working directory. The harness
 * (EdgeWorker) is the only component with access to the live session
 * registry; this interface lets the MCP tool ask for the bundle without
 * depending on harness internals (DIP).
 *
 * Triage on the receiving end needs:
 *   - `sessionId` — cyrus internal session UUID, used as the dedup key
 *     server-side AND (for Linear sessions) the Linear AgentSession id —
 *     these are the same value.
 *   - `runnerSessionId` + `runnerType` — the underlying Claude / Gemini
 *     / Codex / Cursor session id so a team member can fetch the
 *     transcript that produced the failure.
 *   - `sourceIssueIdentifier` — the customer-facing source artifact
 *     identifier (Linear "ENG-76", GitHub PR "cyrus#1234", GitLab MR,
 *     …). Source-agnostic so we don't bake a platform name into the
 *     payload.
 *   - `workspacePath` — the agent's cwd, in case it differs from the
 *     `cwd` the agent reported (e.g. shells in a subdir).
 *   - `sessionSource` — "linear" / "slack" / "github" / "gitlab" /
 *     null. The harness knows the adapter and stamps it here rather
 *     than the tool guessing from a session-id prefix.
 *
 * Everything except `sessionId` is optional — older harnesses or CLI
 * mode may not know all of these.
 */
export interface ResolvedSession {
    sessionId: string;
    runnerSessionId?: string | null;
    runnerType?: "claude" | "gemini" | "codex" | "cursor" | "opencode" | null;
    sourceIssueIdentifier?: string | null;
    workspacePath?: string | null;
    sessionSource?: string | null;
}
export type ResolveSessionFromCwd = (cwd: string) => ResolvedSession | string | null;
/**
 * HTTP client interface for posting to cyrus-hosted. Tests can substitute
 * a mock without standing up a real fetch.
 */
export interface FailureModesHttpClient {
    postFailureMode(input: {
        sessionId: string;
        sessionSource: string | null;
        category: string;
        recap: string;
        userQuoteSnippet: string;
        agentFailureSnippet: string;
        runnerSessionId?: string | null;
        runnerType?: string | null;
        sourceIssueIdentifier?: string | null;
        workspacePath?: string | null;
    }): Promise<{
        ok: true;
    } | {
        ok: false;
        status: number;
        error: string;
    }>;
}
export interface LogFailureModeOptions {
    resolveSessionFromCwd: ResolveSessionFromCwd;
    httpClient: FailureModesHttpClient;
    /**
     * Fallback session id used when `resolveSessionFromCwd(cwd)` returns
     * null but the harness already knows which session is hosting this MCP
     * server (e.g. parentSessionId passed to `createCyrusToolsServer`).
     */
    fallbackSessionId?: string;
}
export declare function registerLogFailureModeTool(server: McpServer, options: LogFailureModeOptions): void;
//# sourceMappingURL=log-failure-mode.d.ts.map