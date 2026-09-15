import type { SessionKey, SessionStore, SessionStoreEntry } from "@anthropic-ai/claude-agent-sdk";
import type { ILogger } from "cyrus-core";
/**
 * HTTP-backed Claude Agent SDK SessionStore.
 *
 * Mirrors session transcripts from an edge-worker / ClaudeRunner to the
 * Cyrus hosted control plane, which persists them in a per-team Supabase
 * table.
 *
 * References (CYPACK-1121):
 *   - SDK session-storage contract & lifecycle:
 *     https://code.claude.com/docs/en/agent-sdk/session-storage
 *   - Reference adapters + behavioral conformance suite:
 *     https://github.com/anthropics/claude-agent-sdk-typescript/tree/main/examples/session-stores
 *
 * Every request carries two pieces of identity, provided by the edge's
 * environment:
 *
 *   - `Authorization: Bearer <CYRUS_API_KEY>` — proves the caller holds the
 *     team's API key.
 *   - `X-Cyrus-Team-Id:  <CYRUS_TEAM_ID>`    — names the team the request
 *     belongs to.
 *
 * The server looks up the team by id (O(1) primary-key lookup) and verifies
 * that the bearer token matches the team's stored key. Unlike the previous
 * hash-reverse-lookup design, no per-request index into `teams` is needed —
 * the edge already knows its own team id.
 *
 * Wire protocol (all POST, JSON body):
 *
 *   POST {baseUrl}/api/sessions/append        { projectKey, sessionId, subpath?, entries }
 *   POST {baseUrl}/api/sessions/load          { projectKey, sessionId, subpath? }          -> { entries: SessionStoreEntry[] | null }
 *   POST {baseUrl}/api/sessions/list-sessions { projectKey }                                -> { sessions: [{ sessionId, mtime }] }
 *   POST {baseUrl}/api/sessions/delete        { projectKey, sessionId, subpath? }
 *   POST {baseUrl}/api/sessions/list-subkeys  { projectKey, sessionId }                     -> { subpaths: string[] }
 *
 * The adapter passes the 13-contract conformance suite from the upstream
 * examples (`examples/session-stores/shared/conformance.ts`) when pointed
 * at a conforming backend. The cyrus-hosted implementation of these routes
 * is the canonical conforming backend.
 */
export interface HttpSessionStoreOptions {
    /** Base URL of the control-plane, e.g. "https://app.atcyrus.com". */
    baseUrl: string;
    /** Team-scoped API key. Sent as `Authorization: Bearer <apiKey>`. */
    apiKey: string;
    /**
     * Team id this edge belongs to. Sent as `X-Cyrus-Team-Id: <teamId>`.
     * The server verifies the bearer token actually belongs to this team.
     */
    teamId: string;
    /**
     * Optional fetch override — primarily for tests. Defaults to the global
     * `fetch`. Signature intentionally matches `globalThis.fetch`.
     */
    fetch?: typeof fetch;
    /** Optional logger; defaults to a silent no-op. */
    logger?: ILogger;
    /** Request timeout in ms. Defaults to 15_000. */
    timeoutMs?: number;
}
/**
 * Header name used to identify the team. Extracted as a module-level
 * constant so tests and any future alternate transport stay in sync.
 */
export declare const CYRUS_TEAM_ID_HEADER = "X-Cyrus-Team-Id";
export declare class HttpSessionStore implements SessionStore {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly teamId;
    private readonly fetchImpl;
    private readonly logger;
    private readonly timeoutMs;
    constructor(opts: HttpSessionStoreOptions);
    append(key: SessionKey, entries: SessionStoreEntry[]): Promise<void>;
    load(key: SessionKey): Promise<SessionStoreEntry[] | null>;
    listSessions(projectKey: string): Promise<Array<{
        sessionId: string;
        mtime: number;
    }>>;
    delete(key: SessionKey): Promise<void>;
    listSubkeys(key: {
        projectKey: string;
        sessionId: string;
    }): Promise<string[]>;
    /**
     * Builds the headers for every request. Kept as a separate method so the
     * auth scheme can be extended (extra headers, different schemes) by
     * subclassing without rewriting the transport.
     */
    protected buildRequestHeaders(): Record<string, string>;
    private post;
}
//# sourceMappingURL=HttpSessionStore.d.ts.map