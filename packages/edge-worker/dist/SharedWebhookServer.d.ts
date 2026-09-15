import { type ILogger } from "cyrus-core";
/**
 * Shared webhook server that can handle multiple Linear tokens
 * Each token has its own webhook secret for signature verification
 */
export declare class SharedWebhookServer {
    private server;
    private webhookHandlers;
    private port;
    private host;
    private isListening;
    private logger;
    constructor(port?: number, host?: string, logger?: ILogger);
    /**
     * Start the shared webhook server
     */
    start(): Promise<void>;
    /**
     * Stop the shared webhook server
     */
    stop(): Promise<void>;
    /**
     * Register a webhook handler for a specific token
     */
    registerWebhookHandler(token: string, secret: string, handler: (body: string, signature: string, timestamp?: string) => boolean): void;
    /**
     * Unregister a webhook handler
     */
    unregisterWebhookHandler(token: string): void;
    /**
     * Get the webhook URL for registration with proxy
     */
    getWebhookUrl(): string;
    /**
     * Handle incoming webhook requests
     */
    private handleWebhookRequest;
}
//# sourceMappingURL=SharedWebhookServer.d.ts.map