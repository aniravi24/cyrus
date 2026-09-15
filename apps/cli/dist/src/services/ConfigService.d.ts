import type { EdgeConfig } from "../config/types.js";
import type { Logger } from "./Logger.js";
/**
 * Service responsible for configuration management
 * Handles loading, saving, and validation of edge configuration
 */
export declare class ConfigService {
    private logger;
    private configPath;
    constructor(cyrusHome: string, logger: Logger);
    /**
     * Get the configuration file path
     */
    getConfigPath(): string;
    /**
     * Load edge configuration from disk
     */
    load(): EdgeConfig;
    /**
     * Run migrations on config to ensure it's up to date
     * Persists changes to disk if any migrations were applied
     */
    private migrateConfig;
    /**
     * Save edge configuration to disk
     */
    save(config: EdgeConfig): void;
    /**
     * Update a specific field in the configuration
     */
    update(updater: (config: EdgeConfig) => EdgeConfig): void;
    /**
     * Check if configuration exists
     */
    exists(): boolean;
}
//# sourceMappingURL=ConfigService.d.ts.map