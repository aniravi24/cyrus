import { CloudflareTunnelClient } from "cyrus-cloudflare-tunnel-client";
import Fastify from "fastify";
/**
 * Shared application server that handles both webhooks and OAuth callbacks on a single port
 * Consolidates functionality from SharedWebhookServer and CLI OAuth server
 */
export class SharedApplicationServer {
    app = null;
    webhookHandlers = new Map();
    // Legacy handlers for direct Linear webhook registration (deprecated)
    linearWebhookHandlers = new Map();
    oauthCallbacks = new Map();
    pendingApprovals = new Map();
    port;
    host;
    isListening = false;
    tunnelClient = null;
    skipTunnel;
    constructor(port = 3456, host = "localhost", skipTunnel = false) {
        this.port = port;
        this.host = host;
        this.skipTunnel = skipTunnel;
    }
    /**
     * Initialize the Fastify app instance (must be called before registering routes)
     */
    initializeFastify() {
        if (this.app) {
            return; // Already initialized
        }
        this.app = Fastify({
            logger: false,
        });
    }
    /**
     * Start the shared application server
     */
    async start() {
        if (this.isListening) {
            return; // Already listening
        }
        // Initialize Fastify if not already done
        this.initializeFastify();
        try {
            await this.app.listen({
                port: this.port,
                host: this.host,
            });
            this.isListening = true;
            console.log(`🔗 Shared application server listening on http://${this.host}:${this.port}`);
            // Start Cloudflare tunnel if CLOUDFLARE_TOKEN is set and tunnel is not skipped
            if (!this.skipTunnel && process.env.CLOUDFLARE_TOKEN) {
                await this.startCloudflareTunnel(process.env.CLOUDFLARE_TOKEN);
            }
        }
        catch (error) {
            this.isListening = false;
            throw error;
        }
    }
    /**
     * Start Cloudflare tunnel and wait for 4 'connected' events
     */
    async startCloudflareTunnel(cloudflareToken) {
        return new Promise((resolve, reject) => {
            let connectionCount = 0;
            const requiredConnections = 4;
            this.tunnelClient = new CloudflareTunnelClient(cloudflareToken, this.port);
            // Listen for connection events (Cloudflare establishes 4 connections per tunnel)
            this.tunnelClient.on("connected", () => {
                connectionCount++;
                console.log(`🔗 Cloudflare tunnel connection ${connectionCount}/${requiredConnections} established`);
                if (connectionCount === requiredConnections) {
                    console.log("✅ Cloudflare tunnel fully connected and ready");
                    resolve();
                }
            });
            // Listen for ready event to get tunnel URL
            this.tunnelClient.on("ready", (tunnelUrl) => {
                console.log(`🔗 Cloudflare tunnel URL: ${tunnelUrl}`);
            });
            // Listen for error events
            this.tunnelClient.on("error", (error) => {
                console.error("❌ Cloudflare tunnel error:", error);
                reject(error);
            });
            // Listen for disconnect events
            this.tunnelClient.on("disconnect", (reason) => {
                console.log(`🔗 Cloudflare tunnel disconnected: ${reason}`);
            });
            // Start the tunnel
            this.tunnelClient.startTunnel().catch(reject);
            // Timeout after 30 seconds
            setTimeout(() => {
                if (connectionCount < requiredConnections) {
                    reject(new Error(`Timeout waiting for Cloudflare tunnel (${connectionCount}/${requiredConnections} connections). This is usually caused by firewall/VPN/proxy blocking cloudflared. See troubleshooting: https://github.com/ceedaragents/cyrus/blob/main/docs/CLOUDFLARE_TUNNEL.md#troubleshooting`));
                }
            }, 30000);
        });
    }
    /**
     * Stop the shared application server
     */
    async stop() {
        // Reject all pending approvals before shutdown
        for (const [sessionId, approval] of this.pendingApprovals) {
            approval.reject(new Error("Server shutting down"));
            console.log(`🔐 Rejected pending approval for session ${sessionId} due to shutdown`);
        }
        this.pendingApprovals.clear();
        // Stop Cloudflare tunnel if running
        if (this.tunnelClient) {
            this.tunnelClient.disconnect();
            this.tunnelClient = null;
            console.log("🔗 Cloudflare tunnel stopped");
        }
        if (this.app && this.isListening) {
            await this.app.close();
            this.isListening = false;
            console.log("🔗 Shared application server stopped");
        }
    }
    /**
     * Get the port number the server is listening on
     */
    getPort() {
        return this.port;
    }
    /**
     * Get the Fastify instance for registering routes
     * Initializes Fastify if not already done
     */
    getFastifyInstance() {
        this.initializeFastify();
        return this.app;
    }
    /**
     * Register a webhook handler for a specific token (LEGACY - deprecated)
     * Supports two signatures:
     * 1. For ndjson-client: (token, secret, handler)
     * 2. For legacy direct registration: (token, handler) where handler takes (req, res)
     *
     * NOTE: New code should use LinearEventTransport which registers routes directly with Fastify
     */
    registerWebhookHandler(token, secretOrHandler, handler) {
        if (typeof secretOrHandler === "string" && handler) {
            // ndjson-client style registration
            this.webhookHandlers.set(token, { secret: secretOrHandler, handler });
            console.log(`🔗 Registered webhook handler (proxy-style) for token ending in ...${token.slice(-4)}`);
        }
        else if (typeof secretOrHandler === "function") {
            // Legacy direct registration
            this.linearWebhookHandlers.set(token, secretOrHandler);
            console.log(`🔗 Registered webhook handler (legacy direct-style) for token ending in ...${token.slice(-4)}`);
        }
        else {
            throw new Error("Invalid webhook handler registration parameters");
        }
    }
    /**
     * Unregister a webhook handler
     */
    unregisterWebhookHandler(token) {
        const hadProxyHandler = this.webhookHandlers.delete(token);
        const hadDirectHandler = this.linearWebhookHandlers.delete(token);
        if (hadProxyHandler || hadDirectHandler) {
            console.log(`🔗 Unregistered webhook handler for token ending in ...${token.slice(-4)}`);
        }
    }
    /**
     * Start OAuth flow and return promise that resolves when callback is received
     */
    async startOAuthFlow(proxyUrl) {
        return new Promise((resolve, reject) => {
            // Generate unique ID for this flow
            const flowId = Date.now().toString();
            // Store callback for this flow
            this.oauthCallbacks.set(flowId, { resolve, reject, id: flowId });
            // Check if we should use direct Linear OAuth (when self-hosting)
            const isExternalHost = process.env.CYRUS_HOST_EXTERNAL?.toLowerCase().trim() === "true";
            const useDirectOAuth = isExternalHost && process.env.LINEAR_CLIENT_ID;
            const callbackBaseUrl = `http://${this.host}:${this.port}`;
            let authUrl;
            if (useDirectOAuth) {
                // Use local OAuth authorize endpoint
                authUrl = `${callbackBaseUrl}/oauth/authorize?callback=${encodeURIComponent(`${callbackBaseUrl}/callback`)}`;
                console.log(`\n🔐 Using direct OAuth mode (CYRUS_HOST_EXTERNAL=true)`);
            }
            else {
                // Use proxy OAuth endpoint
                authUrl = `${proxyUrl}/oauth/authorize?callback=${encodeURIComponent(`${callbackBaseUrl}/callback`)}`;
            }
            console.log(`\n👉 Opening your browser to authorize with Linear...`);
            console.log(`If the browser doesn't open, visit: ${authUrl}`);
            // Timeout after 5 minutes
            setTimeout(() => {
                if (this.oauthCallbacks.has(flowId)) {
                    this.oauthCallbacks.delete(flowId);
                    reject(new Error("OAuth timeout"));
                }
            }, 5 * 60 * 1000);
        });
    }
    /**
     * Get the webhook URL
     */
    getWebhookUrl() {
        return `http://${this.host}:${this.port}/webhook`;
    }
    /**
     * Get the OAuth callback URL for registration with proxy
     */
    getOAuthCallbackUrl() {
        return `http://${this.host}:${this.port}/callback`;
    }
    /**
     * Register an approval request and get approval URL
     */
    registerApprovalRequest(sessionId) {
        // Clean up expired approvals (older than 30 minutes)
        const now = Date.now();
        for (const [key, approval] of this.pendingApprovals) {
            if (now - approval.createdAt > 30 * 60 * 1000) {
                approval.reject(new Error("Approval request expired"));
                this.pendingApprovals.delete(key);
            }
        }
        // Create promise for this approval request
        const promise = new Promise((resolve, reject) => {
            this.pendingApprovals.set(sessionId, {
                resolve: (approved, feedback) => resolve({ approved, feedback }),
                reject,
                sessionId,
                createdAt: now,
            });
        });
        // Generate approval URL
        const url = `http://${this.host}:${this.port}/approval?session=${encodeURIComponent(sessionId)}`;
        console.log(`🔐 Registered approval request for session ${sessionId}: ${url}`);
        return { promise, url };
    }
}
//# sourceMappingURL=SharedApplicationServer.js.map