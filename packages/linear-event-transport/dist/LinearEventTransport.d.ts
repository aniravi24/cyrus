import { EventEmitter } from "node:events";
import type { IAgentEventTransport, TranslationContext } from "cyrus-core";
import { type ILogger } from "cyrus-core";
import type { LinearEventTransportConfig, LinearEventTransportEvents } from "./types.js";
export declare interface LinearEventTransport {
    on<K extends keyof LinearEventTransportEvents>(event: K, listener: LinearEventTransportEvents[K]): this;
    emit<K extends keyof LinearEventTransportEvents>(event: K, ...args: Parameters<LinearEventTransportEvents[K]>): boolean;
}
/**
 * LinearEventTransport - Handles Linear webhook event delivery
 *
 * This class implements IAgentEventTransport to provide a platform-agnostic
 * interface for handling Linear webhooks with Linear-specific verification.
 *
 * It registers a POST /linear-webhook endpoint with a Fastify server, plus
 * a POST /webhook alias retained for backward compatibility (deprecated).
 * Incoming webhooks are verified using either:
 * 1. "direct" mode: Verifies Linear's webhook signature
 * 2. "proxy" mode: Verifies Bearer token authentication
 *
 * The class emits "event" events with AgentEvent (LinearWebhookPayload) data.
 */
export declare class LinearEventTransport extends EventEmitter implements IAgentEventTransport {
    private config;
    private linearWebhookClient;
    private logger;
    private messageTranslator;
    private translationContext;
    constructor(config: LinearEventTransportConfig, logger?: ILogger, translationContext?: TranslationContext);
    /**
     * Set the translation context for message translation.
     * This allows setting Linear API tokens and other context after construction.
     */
    setTranslationContext(context: TranslationContext): void;
    /**
     * Register the /linear-webhook endpoint (plus the deprecated /webhook alias)
     * with the Fastify server.
     */
    register(): void;
    /**
     * Handle webhook in direct mode using Linear's signature verification
     */
    private handleDirectWebhook;
    /**
     * Handle webhook in proxy mode using Bearer token authentication
     */
    private handleProxyWebhook;
    /**
     * Translate and emit an internal message from a webhook payload.
     * Only emits if translation succeeds; logs debug message on failure.
     */
    private emitMessage;
}
//# sourceMappingURL=LinearEventTransport.d.ts.map