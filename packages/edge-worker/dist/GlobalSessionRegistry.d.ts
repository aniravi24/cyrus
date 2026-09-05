/**
 * GlobalSessionRegistry - Centralized session storage across all repositories
 *
 * This is Phase 1 of the CYPACK-724 architectural refactor.
 * Replaces per-repository session storage in AgentSessionManager with a global registry
 * that enables cross-repository session lookups (e.g., parent orchestrator in Repo A
 * creating child issues in Repo B).
 */
import { EventEmitter } from "node:events";
import type { CyrusAgentSession, CyrusAgentSessionEntry, SerializedCyrusAgentSession, SerializedCyrusAgentSessionEntry } from "cyrus-core";
/**
 * Serialization format for GlobalSessionRegistry state
 * Version 3.0 to distinguish from previous per-repository format (v2.0)
 */
export interface SerializedGlobalRegistryState {
    version: "3.0";
    sessions: Record<string, SerializedCyrusAgentSession>;
    entries: Record<string, SerializedCyrusAgentSessionEntry[]>;
    childToParentMap: Record<string, string>;
}
/**
 * Events emitted by GlobalSessionRegistry
 */
export interface GlobalSessionRegistryEvents {
    sessionCreated: (session: CyrusAgentSession) => void;
    sessionUpdated: (sessionId: string, session: CyrusAgentSession, updates: Partial<CyrusAgentSession>) => void;
    sessionCompleted: (sessionId: string, session: CyrusAgentSession) => void;
}
/**
 * GlobalSessionRegistry centralizes all session storage across repositories.
 *
 * Responsibilities:
 * - Store ALL CyrusAgentSession objects (all repos)
 * - Store ALL CyrusAgentSessionEntry arrays (all repos)
 * - Maintain parent-child session relationships
 * - Emit lifecycle events for session changes
 * - Support serialization/deserialization for persistence
 * - Provide cleanup for old sessions
 */
export declare class GlobalSessionRegistry extends EventEmitter {
    /**
     * All sessions keyed by session id
     */
    private sessions;
    /**
     * All entries keyed by session id
     */
    private entries;
    /**
     * Child session ID → parent session ID mapping
     * Enables orchestrator workflows where parent (Repo A) creates child (Repo B)
     */
    private childToParentMap;
    /**
     * Create a new session in the registry
     * @param session The session to create
     * @throws Error if session with same ID already exists
     */
    createSession(session: CyrusAgentSession): void;
    /**
     * Get a session by ID
     * @param sessionId The session id
     * @returns The session or undefined if not found
     */
    getSession(sessionId: string): CyrusAgentSession | undefined;
    /**
     * Update a session with partial data
     * @param sessionId The session id
     * @param updates Partial session data to merge
     * @throws Error if session doesn't exist
     */
    updateSession(sessionId: string, updates: Partial<CyrusAgentSession>): void;
    /**
     * Delete a session and its entries
     * @param sessionId The session id
     */
    deleteSession(sessionId: string): void;
    /**
     * Get all sessions
     * @returns Array of all sessions
     */
    getAllSessions(): CyrusAgentSession[];
    /**
     * Add an entry to a session's conversation history
     * @param sessionId The session id
     * @param entry The entry to add
     * @throws Error if session doesn't exist
     */
    addEntry(sessionId: string, entry: CyrusAgentSessionEntry): void;
    /**
     * Get all entries for a session
     * @param sessionId The session id
     * @returns Array of entries (empty if session has no entries or doesn't exist)
     */
    getEntries(sessionId: string): CyrusAgentSessionEntry[];
    /**
     * Update an entry in a session's conversation history
     * @param sessionId The session id
     * @param entryIndex The index of the entry to update (0-based)
     * @param updates Partial entry data to merge
     * @throws Error if session doesn't exist or index out of bounds
     */
    updateEntry(sessionId: string, entryIndex: number, updates: Partial<CyrusAgentSessionEntry>): void;
    /**
     * Set parent session for a child session (orchestrator workflow)
     * @param childSessionId The child's session id
     * @param parentSessionId The parent's session id
     */
    setParentSession(childSessionId: string, parentSessionId: string): void;
    /**
     * Get parent session ID for a child session
     * @param childSessionId The child's session id
     * @returns The parent session ID or undefined if not found
     */
    getParentSessionId(childSessionId: string): string | undefined;
    /**
     * Get all child session IDs for a parent session
     * @param parentSessionId The parent's session id
     * @returns Array of child session IDs
     */
    getChildSessionIds(parentSessionId: string): string[];
    /**
     * Serialize the registry state for persistence
     * Excludes non-serializable data like agentRunner instances
     * @returns Serialized state
     */
    serializeState(): SerializedGlobalRegistryState;
    /**
     * Restore the registry state from serialized data
     * Clears existing state before restoring
     * @param state Serialized state to restore
     */
    restoreState(state: SerializedGlobalRegistryState): void;
    /**
     * Clean up old sessions based on age
     * Removes sessions where updatedAt is older than maxAgeMs
     * @param maxAgeMs Maximum age in milliseconds (sessions older than this are removed)
     * @returns Number of sessions removed
     */
    cleanup(maxAgeMs: number): number;
}
//# sourceMappingURL=GlobalSessionRegistry.d.ts.map