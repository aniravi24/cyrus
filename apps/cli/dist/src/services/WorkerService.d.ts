import type { RepositoryConfig } from "cyrus-core";
import type { GitService } from "cyrus-edge-worker";
import { EdgeWorker } from "cyrus-edge-worker";
import type { ConfigService } from "./ConfigService.js";
import type { Logger } from "./Logger.js";
/**
 * Service responsible for EdgeWorker and Cloudflare tunnel management
 */
export declare class WorkerService {
    private configService;
    private gitService;
    private cyrusHome;
    private logger;
    private version?;
    private edgeWorker;
    private setupWaitingServer;
    private isShuttingDown;
    constructor(configService: ConfigService, gitService: GitService, cyrusHome: string, logger: Logger, version?: string | undefined);
    /**
     * Get the EdgeWorker instance
     */
    getEdgeWorker(): EdgeWorker | null;
    /**
     * Get the server port from EdgeWorker
     */
    getServerPort(): number;
    /**
     * Start setup waiting mode - server infrastructure only, no EdgeWorker
     * Used after initial authentication while waiting for server configuration
     */
    startSetupWaitingMode(): Promise<void>;
    /**
     * Start idle mode - server infrastructure only, no EdgeWorker
     * Used after onboarding when no repositories are configured
     */
    startIdleMode(): Promise<void>;
    /**
     * Shared infrastructure for modes that run the config-update server without
     * an EdgeWorker (setup-waiting, idle). Only the banner text differs between
     * modes, so callers supply just the mode-specific lines.
     */
    private startPreWorkerServer;
    /**
     * Register webhook endpoints that don't require repositories.
     * Called from both idle and setup-waiting modes so that external services
     * (e.g. Slack URL verification) can reach Cyrus during onboarding.
     */
    private registerWebhookTransports;
    /**
     * Stop the setup waiting mode or idle mode server
     * Must be called before starting EdgeWorker to avoid port conflicts
     */
    stopWaitingServer(): Promise<void>;
    /**
     * Start the EdgeWorker with given configuration
     */
    startEdgeWorker(params: {
        repositories: RepositoryConfig[];
        ngrokAuthToken?: string;
        onOAuthCallback?: (token: string, workspaceId: string, workspaceName: string) => Promise<void>;
    }): Promise<void>;
    /**
     * Set up event handlers for EdgeWorker
     */
    private setupEventHandlers;
    /**
     * Stop the EdgeWorker
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=WorkerService.d.ts.map