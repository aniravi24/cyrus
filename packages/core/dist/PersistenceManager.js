import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createLogger } from "./logging/index.js";
/** Current persistence format version */
export const PERSISTENCE_VERSION = "4.0";
/**
 * Manages persistence of critical mappings to survive restarts
 */
export class PersistenceManager {
    persistencePath;
    logger;
    constructor(persistencePath, logger) {
        this.persistencePath =
            persistencePath || join(homedir(), ".cyrus", "state");
        this.logger = logger ?? createLogger({ component: "PersistenceManager" });
    }
    /**
     * Get the full path to the single EdgeWorker state file
     */
    getEdgeWorkerStateFilePath() {
        return join(this.persistencePath, "edge-worker-state.json");
    }
    /**
     * Ensure the persistence directory exists
     */
    async ensurePersistenceDirectory() {
        await mkdir(this.persistencePath, { recursive: true });
    }
    /**
     * Save EdgeWorker state to disk (single file for all repositories)
     */
    async saveEdgeWorkerState(state) {
        try {
            await this.ensurePersistenceDirectory();
            const stateFile = this.getEdgeWorkerStateFilePath();
            const stateData = {
                version: PERSISTENCE_VERSION,
                savedAt: new Date().toISOString(),
                state,
            };
            // Write-then-rename so the state file is always a complete document.
            // A plain writeFile interrupted mid-write (SIGKILL, OOM kill, power
            // loss) leaves truncated JSON that the next boot cannot parse, which
            // orphans every in-flight session.
            const tmpFile = `${stateFile}.tmp`;
            await writeFile(tmpFile, JSON.stringify(stateData, null, 2), "utf8");
            await rename(tmpFile, stateFile);
        }
        catch (error) {
            this.logger.error("Failed to save EdgeWorker state:", error);
            throw error;
        }
    }
    /**
     * Load EdgeWorker state from disk (single file for all repositories)
     * Automatically migrates from v2.0 to v3.0 format if needed.
     */
    async loadEdgeWorkerState() {
        try {
            const stateFile = this.getEdgeWorkerStateFilePath();
            if (!existsSync(stateFile)) {
                return null;
            }
            const rawState = await readFile(stateFile, "utf8");
            if (!rawState.trim()) {
                // deleteStateFile clears the file rather than unlinking it; an
                // empty file is "no state", not a parse error.
                return null;
            }
            const stateData = JSON.parse(rawState);
            // Validate state structure exists
            if (!stateData.state) {
                this.logger.warn("Invalid state file (missing state), ignoring");
                return null;
            }
            // Handle version migration
            if (stateData.version === "2.0") {
                this.logger.info("Migrating state from v2.0 to v3.0 to v4.0");
                const v3State = this.migrateV2ToV3(stateData.state);
                const migratedState = this.migrateV3ToV4(v3State);
                await this.saveEdgeWorkerState(migratedState);
                this.logger.info(`Migration complete, saved as v${PERSISTENCE_VERSION}`);
                return migratedState;
            }
            if (stateData.version === "3.0") {
                this.logger.info("Migrating state from v3.0 to v4.0");
                const migratedState = this.migrateV3ToV4(stateData.state);
                await this.saveEdgeWorkerState(migratedState);
                this.logger.info(`Migration complete, saved as v${PERSISTENCE_VERSION}`);
                return migratedState;
            }
            if (stateData.version !== PERSISTENCE_VERSION) {
                this.logger.warn(`Unknown state file version ${stateData.version}, ignoring`);
                return null;
            }
            return stateData.state;
        }
        catch (error) {
            this.logger.error("Failed to load EdgeWorker state:", error);
            return null;
        }
    }
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
    migrateV2ToV3(v2State) {
        const migratedState = {
            ...v2State,
            agentSessions: {},
        };
        // Migrate agent sessions
        if (v2State.agentSessions) {
            for (const [repoId, repoSessions] of Object.entries(v2State.agentSessions)) {
                migratedState.agentSessions[repoId] = {};
                for (const [_sessionId, v2Session] of Object.entries(repoSessions)) {
                    const session = v2Session;
                    const migratedSession = this.migrateSessionV2ToV3(session);
                    // Use the new id as the key
                    migratedState.agentSessions[repoId][migratedSession.id] =
                        migratedSession;
                }
            }
        }
        // agentSessionEntries keys need to be updated to use new session IDs
        // Since linearAgentActivitySessionId becomes id, the keys remain the same
        // The entries themselves don't need modification
        return migratedState;
    }
    /**
     * Migrate v3.0 state format to v4.0 format
     *
     * Changes:
     * - Flatten nested {[repoId]: {[sessionId]: session}} to flat {[sessionId]: session}
     * - Flatten nested entries similarly
     */
    migrateV3ToV4(v3State) {
        const flatSessions = {};
        const flatEntries = {};
        // Flatten sessions: merge all repo-keyed sessions into a single flat map
        // Preserve the repoId key as a RepositoryContext so migrated sessions
        // know which repository they belong to (instead of defaulting to [])
        if (v3State.agentSessions) {
            for (const [repoId, repoSessions] of Object.entries(v3State.agentSessions)) {
                for (const [sessionId, session] of Object.entries(repoSessions)) {
                    if (!session.repositories?.length) {
                        session.repositories = [
                            {
                                repositoryId: repoId,
                            },
                        ];
                    }
                    flatSessions[sessionId] = session;
                }
            }
        }
        // Flatten entries similarly
        if (v3State.agentSessionEntries) {
            for (const repoEntries of Object.values(v3State.agentSessionEntries)) {
                for (const [sessionId, entries] of Object.entries(repoEntries)) {
                    flatEntries[sessionId] = entries;
                }
            }
        }
        // Migrate issueRepositoryCache from old Record<string, string> to Record<string, string[]>
        let migratedCache;
        if (v3State.issueRepositoryCache) {
            migratedCache = {};
            for (const [issueId, repoId] of Object.entries(v3State.issueRepositoryCache)) {
                migratedCache[issueId] = [repoId];
            }
        }
        return {
            agentSessions: flatSessions,
            agentSessionEntries: flatEntries,
            childToParentAgentSession: v3State.childToParentAgentSession,
            issueRepositoryCache: migratedCache,
        };
    }
    /**
     * Migrate a single session from v2.0 to v3.0 format
     */
    migrateSessionV2ToV3(v2Session) {
        // Build issueContext from v2.0 fields
        const issueContext = {
            trackerId: "linear", // v2.0 only supported Linear
            issueId: v2Session.issueId,
            issueIdentifier: v2Session.issue?.identifier || v2Session.issueId,
        };
        return {
            // New field: rename linearAgentActivitySessionId to id
            id: v2Session.linearAgentActivitySessionId,
            // New field: store the original Linear session ID as externalSessionId
            externalSessionId: v2Session.linearAgentActivitySessionId,
            // Preserved fields
            type: v2Session.type,
            status: v2Session.status,
            context: v2Session.context,
            createdAt: v2Session.createdAt,
            updatedAt: v2Session.updatedAt,
            workspace: v2Session.workspace,
            claudeSessionId: v2Session.claudeSessionId,
            geminiSessionId: v2Session.geminiSessionId,
            codexSessionId: v2Session.codexSessionId,
            cursorSessionId: v2Session.cursorSessionId,
            opencodeSessionId: v2Session.opencodeSessionId,
            metadata: v2Session.metadata,
            // New field: structured issue context
            issueContext,
            // Kept for backwards compatibility (marked as deprecated in interface)
            issueId: v2Session.issueId,
            // Now optional
            issue: v2Session.issue,
            // New field: empty repositories for migrated sessions
            repositories: [],
        };
    }
    /**
     * Check if EdgeWorker state file exists
     */
    hasStateFile() {
        return existsSync(this.getEdgeWorkerStateFilePath());
    }
    /**
     * Delete EdgeWorker state file
     */
    async deleteStateFile() {
        try {
            const stateFile = this.getEdgeWorkerStateFilePath();
            if (existsSync(stateFile)) {
                await writeFile(stateFile, "", "utf8"); // Clear file instead of deleting
            }
        }
        catch (error) {
            this.logger.error("Failed to delete EdgeWorker state file:", error);
        }
    }
    /**
     * Convert Map to Record for serialization
     */
    static mapToRecord(map) {
        return Object.fromEntries(map.entries());
    }
    /**
     * Convert Record to Map for deserialization
     */
    static recordToMap(record) {
        return new Map(Object.entries(record));
    }
    /**
     * Convert Set to Array for serialization
     */
    static setToArray(set) {
        return Array.from(set);
    }
    /**
     * Convert Array to Set for deserialization
     */
    static arrayToSet(array) {
        return new Set(array);
    }
}
//# sourceMappingURL=PersistenceManager.js.map