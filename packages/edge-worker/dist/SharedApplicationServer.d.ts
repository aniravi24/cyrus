import type { IncomingMessage, ServerResponse } from "node:http";
import { type FastifyInstance } from "fastify";
/**
 * OAuth callback state for tracking flows
 */
export interface OAuthCallback {
    resolve: (credentials: {
        linearToken: string;
        linearWorkspaceId: string;
        linearWorkspaceName: string;
    }) => void;
    reject: (error: Error) => void;
    id: string;
}
/**
 * Approval callback state for tracking approval workflows
 */
export interface ApprovalCallback {
    resolve: (approved: boolean, feedback?: string) => void;
    reject: (error: Error) => void;
    sessionId: string;
    createdAt: number;
}
/**
 * Shared application server that handles both webhooks and OAuth callbacks on a single port
 * Consolidates functionality from SharedWebhookServer and CLI OAuth server
 */
export declare class SharedApplicationServer {
    private app;
    private webhookHandlers;
    private linearWebhookHandlers;
    private oauthCallbacks;
    private pendingApprovals;
    private port;
    private host;
    private isListening;
    private tunnelClient;
    private skipTunnel;
    constructor(port?: number, host?: string, skipTunnel?: boolean);
    /**
     * Initialize the Fastify app instance (must be called before registering routes)
     */
    initializeFastify(): void;
    /**
     * Start the shared application server
     */
    start(): Promise<void>;
    /**
     * Start Cloudflare tunnel and wait for 4 'connected' events
     */
    private startCloudflareTunnel;
    /**
     * Stop the shared application server
     */
    stop(): Promise<void>;
    /**
     * Get the port number the server is listening on
     */
    getPort(): number;
    /**
     * Get the Fastify instance for registering routes
     * Initializes Fastify if not already done
     */
    getFastifyInstance(): FastifyInstance;
    /**
     * Register a webhook handler for a specific token (LEGACY - deprecated)
     * Supports two signatures:
     * 1. For ndjson-client: (token, secret, handler)
     * 2. For legacy direct registration: (token, handler) where handler takes (req, res)
     *
     * NOTE: New code should use LinearEventTransport which registers routes directly with Fastify
     */
    registerWebhookHandler(token: string, secretOrHandler: string | ((req: IncomingMessage, res: ServerResponse) => Promise<void>), handler?: (body: string, signature: string, timestamp?: string) => boolean): void;
    /**
     * Unregister a webhook handler
     */
    unregisterWebhookHandler(token: string): void;
    /**
     * Start OAuth flow and return promise that resolves when callback is received
     */
    startOAuthFlow(proxyUrl: string): Promise<{
        linearToken: string;
        linearWorkspaceId: string;
        linearWorkspaceName: string;
    }>;
    /**
     * Get the webhook URL
     */
    getWebhookUrl(): string;
    /**
     * Get the OAuth callback URL for registration with proxy
     */
    getOAuthCallbackUrl(): string;
    /**
     * Register an approval request and get approval URL
     */
    registerApprovalRequest(sessionId: string): {
        promise: Promise<{
            approved: boolean;
            feedback?: string;
        }>;
        url: string;
    };
}
//# sourceMappingURL=SharedApplicationServer.d.ts.map