import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { bin, install, Tunnel } from "cloudflared";
/**
 * Cloudflare tunnel client for establishing tunnels to local services
 * Handles ONLY tunnel establishment - HTTP handling is done by SharedApplicationServer
 */
export class CloudflareTunnelClient extends EventEmitter {
    tunnelProcess = null;
    tunnelUrl = null;
    connected = false;
    connectionCount = 0;
    cloudflareToken;
    localPort;
    constructor(cloudflareToken, localPort, onReady) {
        super();
        this.cloudflareToken = cloudflareToken;
        this.localPort = localPort;
        // Set up onReady callback if provided
        if (onReady) {
            this.on("ready", onReady);
        }
    }
    /**
     * Start the Cloudflare tunnel
     */
    async startTunnel() {
        try {
            // Ensure cloudflared binary is installed
            if (!existsSync(bin)) {
                await install(bin);
            }
            console.log(`Starting tunnel to localhost:${this.localPort}`);
            // Create tunnel with token-based authentication (no URL needed for remotely-managed tunnels)
            const tunnel = Tunnel.withToken(this.cloudflareToken);
            // Listen for URL event (from ConfigHandler for token-based tunnels)
            tunnel.on("url", (url) => {
                // Ensure URL has protocol for token-based tunnels
                if (!url.startsWith("http")) {
                    url = `https://${url}`;
                }
                if (!this.tunnelUrl) {
                    this.tunnelUrl = url;
                    this.emit("ready", this.tunnelUrl);
                }
            });
            // Listen for connection event (Cloudflare establishes 4 connections per tunnel)
            tunnel.on("connected", (connection) => {
                this.connectionCount++;
                console.log(`Cloudflare tunnel connection ${this.connectionCount}/4 established:`, connection);
                // Emit 'connected' event for each connection (for external listeners)
                this.emit("connected", connection);
                // Mark as connected on first connection, but log all 4
                if (!this.connected) {
                    this.connected = true;
                    this.emit("connect");
                }
            });
            // Listen for error event
            tunnel.on("error", (error) => {
                this.emit("error", error);
            });
            // Listen for exit event
            tunnel.on("exit", (code) => {
                this.connected = false;
                this.connectionCount = 0; // Reset count on disconnect for fresh reconnection logs
                this.emit("disconnect", `Tunnel process exited with code ${code}`);
            });
            // Wait for tunnel URL to be available (with timeout)
            // 120s: slow DNS resolvers (e.g. dead IPv6 nameservers ahead of the
            // working one) can delay the first connection past 30s
            await this.waitForTunnelToConnect(120000);
        }
        catch (error) {
            this.emit("error", error);
            throw error;
        }
    }
    /**
     * Wait for tunnel URL to be available
     */
    async waitForTunnelToConnect(timeout) {
        const startTime = Date.now();
        while (!this.connected) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Timeout waiting for tunnel URL");
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    /**
     * Get the tunnel URL
     */
    getTunnelUrl() {
        return this.tunnelUrl;
    }
    /**
     * Check if client is connected
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.tunnelProcess) {
            this.tunnelProcess.kill();
            this.tunnelProcess = null;
        }
        this.connected = false;
        this.connectionCount = 0; // Reset count on disconnect for fresh reconnection logs
        this.emit("disconnect", "Client disconnected");
    }
}
//# sourceMappingURL=CloudflareTunnelClient.js.map