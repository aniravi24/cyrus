import { EventEmitter } from "node:events";
import type { TranslationContext } from "cyrus-core";
import { type ILogger } from "cyrus-core";
import type { GitLabEventTransportConfig, GitLabEventTransportEvents } from "./types.js";
export declare interface GitLabEventTransport {
    on<K extends keyof GitLabEventTransportEvents>(event: K, listener: GitLabEventTransportEvents[K]): this;
    emit<K extends keyof GitLabEventTransportEvents>(event: K, ...args: Parameters<GitLabEventTransportEvents[K]>): boolean;
}
/**
 * GitLabEventTransport - Handles forwarded GitLab webhook event delivery
 *
 * This class provides a typed EventEmitter-based transport
 * for handling GitLab webhooks forwarded from CYHOST.
 *
 * It registers a POST /gitlab-webhook endpoint with a Fastify server
 * and verifies incoming webhooks using either:
 * 1. "proxy" mode: Verifies Bearer token authentication (self-hosted)
 * 2. "signature" mode: Verifies X-Gitlab-Token header (direct webhooks)
 *
 * Supported GitLab event types:
 * - note: Comments/notes on merge requests
 * - merge_request: MR state changes (approved, changes_requested, etc.)
 */
export declare class GitLabEventTransport extends EventEmitter {
    private config;
    private logger;
    private messageTranslator;
    private translationContext;
    constructor(config: GitLabEventTransportConfig, logger?: ILogger, translationContext?: TranslationContext);
    /**
     * Set the translation context for message translation.
     */
    setTranslationContext(context: TranslationContext): void;
    /**
     * Resolve the effective verification mode and secret at request time.
     * When started in proxy mode, checks if GITLAB_WEBHOOK_SECRET and
     * CYRUS_HOST_EXTERNAL have been added to the environment since startup,
     * enabling a runtime switch to signature verification.
     */
    private resolveVerification;
    /**
     * Register the /gitlab-webhook endpoint with the Fastify server
     */
    register(): void;
    /**
     * Handle webhook using GitLab's X-Gitlab-Token secret verification.
     * GitLab uses a simple token comparison (not HMAC).
     */
    private handleSignatureWebhook;
    /**
     * Handle webhook using Bearer token authentication (forwarded from CYHOST)
     */
    private handleProxyWebhook;
    /**
     * Process the webhook request and emit the appropriate event
     */
    private processAndEmitEvent;
    /**
     * Translate and emit an internal message from a webhook event.
     */
    private emitMessage;
}
//# sourceMappingURL=GitLabEventTransport.d.ts.map