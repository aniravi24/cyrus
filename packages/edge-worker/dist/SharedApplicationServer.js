import { CloudflareTunnelClient } from "cyrus-cloudflare-tunnel-client";
import { createLogger } from "cyrus-core";
import Fastify from "fastify";
const ROBOTS_TXT = "User-agent: *\nDisallow: /\n";
const ROBOTS_HEADER = "noindex, nofollow";
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
    logger;
    constructor(port = 3456, host = "localhost", skipTunnel = false, logger) {
        this.port = port;
        this.host = host;
        this.skipTunnel = skipTunnel;
        this.logger =
            logger ?? createLogger({ component: "SharedApplicationServer" });
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
            trustProxy: true,
        });
        this.app.addHook("onRequest", (_request, reply, done) => {
            reply.header("X-Robots-Tag", ROBOTS_HEADER);
            done();
        });
        this.app.get("/robots.txt", async (_request, reply) => {
            return reply
                .type("text/plain; charset=utf-8")
                .header("Cache-Control", "public, max-age=3600")
                .send(ROBOTS_TXT);
        });
        // Preserve raw request body for webhook signature verification (GitHub HMAC-SHA256).
        // Fastify's default JSON parser discards the raw bytes, but signature checks need
        // the exact payload GitHub sent. This replaces the default parser with one that
        // stashes the raw string on `request.rawBody` before parsing.
        this.app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
            req.rawBody = body;
            try {
                done(null, JSON.parse(body));
            }
            catch (err) {
                done(err);
            }
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
            this.logger.info(`Shared application server listening on http://${this.host}:${this.port}`);
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
                this.logger.info(`Cloudflare tunnel connection ${connectionCount}/${requiredConnections} established`);
                if (connectionCount === requiredConnections) {
                    this.logger.info("Cloudflare tunnel fully connected and ready");
                    resolve();
                }
            });
            // Listen for ready event to get tunnel URL
            this.tunnelClient.on("ready", (tunnelUrl) => {
                this.logger.info(`Cloudflare tunnel URL: ${tunnelUrl}`);
            });
            // Listen for error events
            this.tunnelClient.on("error", (error) => {
                this.logger.error("Cloudflare tunnel error:", error);
                reject(error);
            });
            // Listen for disconnect events
            this.tunnelClient.on("disconnect", (reason) => {
                this.logger.info(`Cloudflare tunnel disconnected: ${reason}`);
            });
            // Start the tunnel
            this.tunnelClient.startTunnel().catch(reject);
            // Timeout after 120 seconds (slow DNS resolvers can delay cloudflared
            // connection registration past 30s, e.g. on cloud Macs with dead
            // IPv6 nameservers ahead of the working resolver)
            setTimeout(() => {
                if (connectionCount < requiredConnections) {
                    reject(new Error(`Timeout waiting for Cloudflare tunnel (${connectionCount}/${requiredConnections} connections). This is usually caused by firewall/VPN/proxy blocking cloudflared. See troubleshooting: https://github.com/ceedaragents/cyrus/blob/main/docs/CLOUDFLARE_TUNNEL.md#troubleshooting`));
                }
            }, 120000);
        });
    }
    /**
     * Stop the shared application server
     */
    async stop() {
        // Reject all pending approvals before shutdown
        for (const [sessionId, approval] of this.pendingApprovals) {
            approval.reject(new Error("Server shutting down"));
            this.logger.debug(`Rejected pending approval for session ${sessionId} due to shutdown`);
        }
        this.pendingApprovals.clear();
        // Stop Cloudflare tunnel if running
        if (this.tunnelClient) {
            this.tunnelClient.disconnect();
            this.tunnelClient = null;
            this.logger.info("Cloudflare tunnel stopped");
        }
        if (this.app && this.isListening) {
            await this.app.close();
            this.isListening = false;
            this.logger.info("Shared application server stopped");
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
            this.logger.debug(`Registered webhook handler (proxy-style) for token ending in ...${token.slice(-4)}`);
        }
        else if (typeof secretOrHandler === "function") {
            // Legacy direct registration
            this.linearWebhookHandlers.set(token, secretOrHandler);
            this.logger.debug(`Registered webhook handler (legacy direct-style) for token ending in ...${token.slice(-4)}`);
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
            this.logger.debug(`Unregistered webhook handler for token ending in ...${token.slice(-4)}`);
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
                this.logger.info(`Using direct OAuth mode (CYRUS_HOST_EXTERNAL=true)`);
            }
            else {
                // Use proxy OAuth endpoint
                authUrl = `${proxyUrl}/oauth/authorize?callback=${encodeURIComponent(`${callbackBaseUrl}/callback`)}`;
            }
            this.logger.info(`Opening your browser to authorize with Linear...`);
            this.logger.info(`If the browser doesn't open, visit: ${authUrl}`);
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
        return `http://${this.host}:${this.port}/linear-webhook`;
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
        this.logger.debug(`Registered approval request for session ${sessionId}: ${url}`);
        return { promise, url };
    }
}
//# sourceMappingURL=SharedApplicationServer.js.map