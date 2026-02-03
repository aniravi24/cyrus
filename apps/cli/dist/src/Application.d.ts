import { GitService, SharedApplicationServer } from "cyrus-edge-worker";
import { ConfigService } from "./services/ConfigService.js";
import { Logger } from "./services/Logger.js";
import { WorkerService } from "./services/WorkerService.js";
/**
 * Main application context providing access to services
 */
export declare class Application {
    readonly cyrusHome: string;
    readonly config: ConfigService;
    readonly git: GitService;
    readonly worker: WorkerService;
    readonly logger: Logger;
    readonly version: string;
    private envWatcher?;
    private configWatcher?;
    private isInSetupWaitingMode;
    private isInIdleMode;
    private readonly envFilePath;
    constructor(cyrusHome: string, customEnvPath?: string, version?: string);
    /**
     * Load environment variables from the configured env file path
     */
    private loadEnvFile;
    /**
     * Setup file watcher for .env file to reload on changes
     */
    private setupEnvFileWatcher;
    /**
     * Ensure required Cyrus directories exist
     * Creates: ~/.cyrus/repos, ~/.cyrus/worktrees, ~/.cyrus/mcp-configs
     */
    private ensureRequiredDirectories;
    /**
     * Get proxy URL from environment or use default
     */
    getProxyUrl(): string;
    /**
     * Check if using default proxy
     */
    isUsingDefaultProxy(): boolean;
    /**
     * Create a temporary SharedApplicationServer for OAuth
     */
    createTempServer(): Promise<SharedApplicationServer>;
    /**
     * Enable setup waiting mode and start watching config.json for repositories
     */
    enableSetupWaitingMode(): void;
    /**
     * Enable idle mode (post-onboarding, no repositories) and start watching config.json
     */
    enableIdleMode(): void;
    /**
     * Setup file watcher for config.json to detect when repositories are added
     */
    private startConfigWatcher;
    /**
     * Remove CYRUS_SETUP_PENDING flag from .env file
     */
    private removeSetupPendingFlag;
    /**
     * Transition from setup waiting mode to normal operation
     */
    private transitionToNormalMode;
    /**
     * Handle graceful shutdown
     */
    shutdown(): Promise<void>;
    /**
     * Setup process signal handlers
     */
    setupSignalHandlers(): void;
}
//# sourceMappingURL=Application.d.ts.map