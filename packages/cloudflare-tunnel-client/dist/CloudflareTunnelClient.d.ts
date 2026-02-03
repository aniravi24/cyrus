import { EventEmitter } from "node:events";
import type { CloudflareTunnelClientEvents } from "./types.js";
export declare interface CloudflareTunnelClient {
    on<K extends keyof CloudflareTunnelClientEvents>(event: K, listener: CloudflareTunnelClientEvents[K]): this;
    emit<K extends keyof CloudflareTunnelClientEvents>(event: K, ...args: Parameters<CloudflareTunnelClientEvents[K]>): boolean;
}
/**
 * Cloudflare tunnel client for establishing tunnels to local services
 * Handles ONLY tunnel establishment - HTTP handling is done by SharedApplicationServer
 */
export declare class CloudflareTunnelClient extends EventEmitter {
    private tunnelProcess;
    private tunnelUrl;
    private connected;
    private connectionCount;
    private cloudflareToken;
    private localPort;
    constructor(cloudflareToken: string, localPort: number, onReady?: (tunnelUrl: string) => void);
    /**
     * Start the Cloudflare tunnel
     */
    startTunnel(): Promise<void>;
    /**
     * Wait for tunnel URL to be available
     */
    private waitForTunnelToConnect;
    /**
     * Get the tunnel URL
     */
    getTunnelUrl(): string | null;
    /**
     * Check if client is connected
     */
    isConnected(): boolean;
    /**
     * Disconnect and cleanup
     */
    disconnect(): void;
}
//# sourceMappingURL=CloudflareTunnelClient.d.ts.map