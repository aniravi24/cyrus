import { EventEmitter } from "node:events";
import type { EdgeWorkerConfig, ILogger, RepositoryConfig } from "cyrus-core";
/**
 * Describes the set of repository-level changes detected after a config
 * file reload.  Emitted as the payload of the `configChanged` event.
 */
export interface RepositoryChanges {
    added: RepositoryConfig[];
    modified: RepositoryConfig[];
    removed: RepositoryConfig[];
    /** The fully-merged new config (caller should replace its reference). */
    newConfig: EdgeWorkerConfig;
}
/**
 * Events emitted by ConfigManager.
 */
export interface ConfigManagerEvents {
    configChanged: (changes: RepositoryChanges) => void;
}
/**
 * ConfigManager is responsible for watching, loading, validating, and
 * diffing the EdgeWorker configuration file.  It does **not** perform any
 * repository lifecycle operations (adding / updating / removing session
 * managers, issue trackers, etc.) -- instead it emits a `configChanged`
 * event that the EdgeWorker listens to and acts upon.
 *
 * Usage:
 * ```ts
 * const configManager = new ConfigManager(config, logger, configPath, repositories);
 * configManager.on("configChanged", async (changes) => {
 *   await removeDeletedRepositories(changes.removed);
 *   await updateModifiedRepositories(changes.modified);
 *   await addNewRepositories(changes.added);
 *   this.config = changes.newConfig;
 * });
 * configManager.startConfigWatcher();
 * ```
 */
export declare class ConfigManager extends EventEmitter {
    private config;
    private readonly logger;
    private configPath?;
    /** Live reference to EdgeWorker's repository map -- used for diffing. */
    private readonly repositories;
    private configWatcher?;
    constructor(config: EdgeWorkerConfig, logger: ILogger, configPath: string | undefined, repositories: Map<string, RepositoryConfig>);
    /**
     * Start watching the config file for changes.  Each detected change
     * triggers a reload-and-diff cycle; if repository-level changes are
     * found a `configChanged` event is emitted.
     */
    startConfigWatcher(): void;
    /**
     * Stop the config file watcher and release resources.
     */
    stop(): Promise<void>;
    /**
     * Return the current (possibly reloaded) config snapshot.
     */
    getConfig(): EdgeWorkerConfig;
    /**
     * Update the internal config reference.  This is useful when the
     * EdgeWorker needs to push an externally-modified config back into
     * the ConfigManager (e.g. after applying the changes from a
     * `configChanged` event).
     */
    setConfig(config: EdgeWorkerConfig): void;
    /**
     * Update the config file path (e.g. when set after construction).
     */
    setConfigPath(configPath: string): void;
    /**
     * Handle a config file change event: load, validate, diff, and emit.
     */
    private handleConfigChange;
    /**
     * Safely load configuration from the file, merging with the current
     * in-memory config for fields that are not present in the file.
     */
    private loadConfigSafely;
    /**
     * Detect changes between the current in-memory repository map and
     * the repositories declared in `newConfig`.
     */
    private detectRepositoryChanges;
    /**
     * Detect changes to non-repository (global) config fields such as
     * `defaultRunner`, `claudeDefaultModel`, `promptDefaults`, etc.
     */
    private detectGlobalConfigChanges;
    /**
     * Deep equality check for repository configs.
     */
    private deepEqual;
}
//# sourceMappingURL=ConfigManager.d.ts.map