import { getCyrusAppUrl } from "cyrus-cloudflare-tunnel-client";
import { EdgeWorker } from "cyrus-edge-worker";
import { DEFAULT_SERVER_PORT, parsePort } from "../config/constants.js";
/**
 * Service responsible for EdgeWorker and Cloudflare tunnel management
 */
export class WorkerService {
    configService;
    gitService;
    cyrusHome;
    logger;
    version;
    edgeWorker = null;
    setupWaitingServer = null; // SharedApplicationServer instance during setup waiting mode
    isShuttingDown = false;
    constructor(configService, gitService, cyrusHome, logger, version) {
        this.configService = configService;
        this.gitService = gitService;
        this.cyrusHome = cyrusHome;
        this.logger = logger;
        this.version = version;
    }
    /**
     * Get the EdgeWorker instance
     */
    getEdgeWorker() {
        return this.edgeWorker;
    }
    /**
     * Get the server port from EdgeWorker
     */
    getServerPort() {
        return this.edgeWorker?.getServerPort() || DEFAULT_SERVER_PORT;
    }
    /**
     * Start setup waiting mode - server infrastructure only, no EdgeWorker
     * Used after initial authentication while waiting for server configuration
     */
    async startSetupWaitingMode() {
        const { SharedApplicationServer } = await import("cyrus-edge-worker");
        const { ConfigUpdater } = await import("cyrus-config-updater");
        // Determine server configuration
        const isExternalHost = process.env.CYRUS_HOST_EXTERNAL?.toLowerCase().trim() === "true";
        const serverPort = parsePort(process.env.CYRUS_SERVER_PORT, DEFAULT_SERVER_PORT);
        const serverHost = isExternalHost ? "0.0.0.0" : "localhost";
        // Create and start SharedApplicationServer
        this.setupWaitingServer = new SharedApplicationServer(serverPort, serverHost);
        this.setupWaitingServer.initializeFastify();
        // Register ConfigUpdater routes
        const configUpdater = new ConfigUpdater(this.setupWaitingServer.getFastifyInstance(), this.cyrusHome, process.env.CYRUS_API_KEY || "");
        configUpdater.register();
        this.logger.info("✅ Config updater registered");
        this.logger.info("   Routes: /api/update/cyrus-config, /api/update/cyrus-env,");
        this.logger.info("           /api/update/repository, /api/test-mcp, /api/configure-mcp");
        // Start the server (this also starts Cloudflare tunnel if CLOUDFLARE_TOKEN is set)
        await this.setupWaitingServer.start();
        this.logger.raw("");
        this.logger.divider(70);
        this.logger.info("⏳ Waiting for configuration from server...");
        this.logger.info(`🔗 Server running on port ${serverPort}`);
        if (process.env.CLOUDFLARE_TOKEN) {
            this.logger.info("🌩️  Cloudflare tunnel: Active");
        }
        this.logger.info("📡 Config updater: Ready");
        this.logger.raw("");
        this.logger.info("Your Cyrus instance is ready to receive configuration.");
        this.logger.info(`Complete setup at: ${getCyrusAppUrl()}/onboarding`);
        this.logger.divider(70);
    }
    /**
     * Start idle mode - server infrastructure only, no EdgeWorker
     * Used after onboarding when no repositories are configured
     */
    async startIdleMode() {
        const { SharedApplicationServer } = await import("cyrus-edge-worker");
        const { ConfigUpdater } = await import("cyrus-config-updater");
        // Determine server configuration
        const isExternalHost = process.env.CYRUS_HOST_EXTERNAL?.toLowerCase().trim() === "true";
        const serverPort = parsePort(process.env.CYRUS_SERVER_PORT, DEFAULT_SERVER_PORT);
        const serverHost = isExternalHost ? "0.0.0.0" : "localhost";
        // Create and start SharedApplicationServer
        this.setupWaitingServer = new SharedApplicationServer(serverPort, serverHost);
        this.setupWaitingServer.initializeFastify();
        // Register ConfigUpdater routes
        const configUpdater = new ConfigUpdater(this.setupWaitingServer.getFastifyInstance(), this.cyrusHome, process.env.CYRUS_API_KEY || "");
        configUpdater.register();
        this.logger.info("✅ Config updater registered");
        this.logger.info("   Routes: /api/update/cyrus-config, /api/update/cyrus-env,");
        this.logger.info("           /api/update/repository, /api/test-mcp, /api/configure-mcp");
        // Start the server (this also starts Cloudflare tunnel if CLOUDFLARE_TOKEN is set)
        await this.setupWaitingServer.start();
        this.logger.raw("");
        this.logger.divider(70);
        this.logger.info("⏸️  No repositories configured");
        this.logger.info(`🔗 Server running on port ${serverPort}`);
        if (process.env.CLOUDFLARE_TOKEN) {
            this.logger.info("🌩️  Cloudflare tunnel: Active");
        }
        this.logger.info("📡 Config updater: Ready");
        this.logger.raw("");
        const appUrl = getCyrusAppUrl();
        this.logger.info(`Waiting for repository configuration from ${appUrl}`);
        this.logger.info(`Add repositories at: ${appUrl}/repos`);
        this.logger.divider(70);
    }
    /**
     * Stop the setup waiting mode or idle mode server
     * Must be called before starting EdgeWorker to avoid port conflicts
     */
    async stopWaitingServer() {
        if (this.setupWaitingServer) {
            this.logger.info("🛑 Stopping waiting server...");
            await this.setupWaitingServer.stop();
            this.setupWaitingServer = null;
            this.logger.info("✅ Waiting server stopped");
        }
    }
    /**
     * Start the EdgeWorker with given configuration
     */
    async startEdgeWorker(params) {
        const { repositories, ngrokAuthToken, onOAuthCallback } = params;
        // Determine if using external host
        const isExternalHost = process.env.CYRUS_HOST_EXTERNAL?.toLowerCase().trim() === "true";
        // Load config once for model defaults
        const edgeConfig = this.configService.load();
        // Create EdgeWorker configuration
        const config = {
            version: this.version,
            repositories,
            cyrusHome: this.cyrusHome,
            defaultAllowedTools: process.env.ALLOWED_TOOLS?.split(",").map((t) => t.trim()) || [],
            defaultDisallowedTools: process.env.DISALLOWED_TOOLS?.split(",").map((t) => t.trim()) ||
                undefined,
            // Model configuration: environment variables take precedence over config file
            defaultModel: process.env.CYRUS_DEFAULT_MODEL || edgeConfig.defaultModel,
            defaultFallbackModel: process.env.CYRUS_DEFAULT_FALLBACK_MODEL ||
                edgeConfig.defaultFallbackModel,
            webhookBaseUrl: process.env.CYRUS_BASE_URL,
            serverPort: parsePort(process.env.CYRUS_SERVER_PORT, DEFAULT_SERVER_PORT),
            serverHost: isExternalHost ? "0.0.0.0" : "localhost",
            ngrokAuthToken,
            // User access control configuration
            userAccessControl: edgeConfig.userAccessControl,
            handlers: {
                createWorkspace: async (issue, repository) => {
                    return this.gitService.createGitWorktree(issue, repository, edgeConfig.global_setup_script);
                },
                onOAuthCallback,
            },
        };
        // Create and start EdgeWorker
        this.edgeWorker = new EdgeWorker(config);
        // Set config path for dynamic reloading
        const configPath = this.configService.getConfigPath();
        this.edgeWorker.setConfigPath(configPath);
        // Set up event handlers
        this.setupEventHandlers();
        // Start the worker
        await this.edgeWorker.start();
        this.logger.success("Edge worker started successfully");
        this.logger.info(`Managing ${repositories.length} repositories:`);
        repositories.forEach((repo) => {
            this.logger.info(`  - ${repo.name} (${repo.repositoryPath})`);
        });
    }
    /**
     * Set up event handlers for EdgeWorker
     */
    setupEventHandlers() {
        if (!this.edgeWorker)
            return;
        // Session events
        this.edgeWorker.on("session:started", (issueId, _issue, repositoryId) => {
            this.logger.info(`Started session for issue ${issueId} in repository ${repositoryId}`);
        });
        this.edgeWorker.on("session:ended", (issueId, exitCode, repositoryId) => {
            this.logger.info(`Session for issue ${issueId} ended with exit code ${exitCode} in repository ${repositoryId}`);
        });
        // Connection events
        this.edgeWorker.on("connected", (token) => {
            this.logger.success(`Connected to proxy with token ending in ...${token.slice(-4)}`);
        });
        this.edgeWorker.on("disconnected", (token, reason) => {
            this.logger.error(`Disconnected from proxy (token ...${token.slice(-4)}): ${reason || "Unknown reason"}`);
        });
        // Error events
        this.edgeWorker.on("error", (error) => {
            this.logger.error(`EdgeWorker error: ${error.message}`);
        });
    }
    /**
     * Stop the EdgeWorker
     */
    async stop() {
        if (this.isShuttingDown)
            return;
        this.isShuttingDown = true;
        this.logger.info("\nShutting down edge worker...");
        // Stop setup waiting mode server if still running
        if (this.setupWaitingServer) {
            await this.setupWaitingServer.stop();
            this.setupWaitingServer = null;
        }
        // Stop edge worker (includes stopping shared application server and Cloudflare tunnel)
        if (this.edgeWorker) {
            await this.edgeWorker.stop();
        }
        this.logger.info("Shutdown complete");
    }
}
//# sourceMappingURL=WorkerService.js.map