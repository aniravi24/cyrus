import type { CyrusAgentSession, CyrusAgentSessionEntry } from "./CyrusAgentSession.js";
import { type ILogger } from "./logging/index.js";
/** Current persistence format version */
export declare const PERSISTENCE_VERSION = "4.0";
export type SerializedCyrusAgentSession = CyrusAgentSession;
export type SerializedCyrusAgentSessionEntry = CyrusAgentSessionEntry;
/**
 * Serializable EdgeWorker state for persistence
 *
 * v4.0: Flat session format - sessions keyed directly by sessionId (no repo nesting)
 * v3.0: Nested format - sessions keyed by [repoId][sessionId]
 */
export interface SerializableEdgeWorkerState {
    agentSessions?: Record<string, SerializedCyrusAgentSession>;
    agentSessionEntries?: Record<string, SerializedCyrusAgentSessionEntry[]>;
    childToParentAgentSession?: Record<string, string>;
    issueRepositoryCache?: Record<string, string[]>;
}
/**
 * v3.0 nested state format (for migration purposes)
 */
export interface V3SerializableEdgeWorkerState {
    agentSessions?: Record<string, Record<string, SerializedCyrusAgentSession>>;
    agentSessionEntries?: Record<string, Record<string, SerializedCyrusAgentSessionEntry[]>>;
    childToParentAgentSession?: Record<string, string>;
    issueRepositoryCache?: Record<string, string>;
}
/**
 * Manages persistence of critical mappings to survive restarts
 */
export declare class PersistenceManager {
    private persistencePath;
    private logger;
    constructor(persistencePath?: string, logger?: ILogger);
    /**
     * Get the full path to the single EdgeWorker state file
     */
    private getEdgeWorkerStateFilePath;
    /**
     * Ensure the persistence directory exists
     */
    private ensurePersistenceDirectory;
    /**
     * Save EdgeWorker state to disk (single file for all repositories)
     */
    saveEdgeWorkerState(state: SerializableEdgeWorkerState): Promise<void>;
    /**
     * Load EdgeWorker state from disk (single file for all repositories)
     * Automatically migrates from v2.0 to v3.0 format if needed.
     */
    loadEdgeWorkerState(): Promise<SerializableEdgeWorkerState | null>;
    /**
     * Migrate v2.0 state format to v3.0 format
     *
     * Changes:
     * - linearAgentActivitySessionId -> id
     * - Add externalSessionId (set to original linearAgentActivitySessionId for Linear sessions)
     * - Add issueContext object with trackerId, issueId, issueIdentifier
     * - issueId becomes optional (kept for backwards compatibility)
     * - issue becomes optional
     */
    private migrateV2ToV3;
    /**
     * Migrate v3.0 state format to v4.0 format
     *
     * Changes:
     * - Flatten nested {[repoId]: {[sessionId]: session}} to flat {[sessionId]: session}
     * - Flatten nested entries similarly
     */
    private migrateV3ToV4;
    /**
     * Migrate a single session from v2.0 to v3.0 format
     */
    private migrateSessionV2ToV3;
    /**
     * Check if EdgeWorker state file exists
     */
    hasStateFile(): boolean;
    /**
     * Delete EdgeWorker state file
     */
    deleteStateFile(): Promise<void>;
    /**
     * Convert Map to Record for serialization
     */
    static mapToRecord<T>(map: Map<string, T>): Record<string, T>;
    /**
     * Convert Record to Map for deserialization
     */
    static recordToMap<T>(record: Record<string, T>): Map<string, T>;
    /**
     * Convert Set to Array for serialization
     */
    static setToArray<T>(set: Set<T>): T[];
    /**
     * Convert Array to Set for deserialization
     */
    static arrayToSet<T>(array: T[]): Set<T>;
}
//# sourceMappingURL=PersistenceManager.d.ts.map