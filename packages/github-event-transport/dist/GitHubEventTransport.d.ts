import { EventEmitter } from "node:events";
import type { TranslationContext } from "cyrus-core";
import { type ILogger } from "cyrus-core";
import type { GitHubEventTransportConfig, GitHubEventTransportEvents } from "./types.js";
export declare interface GitHubEventTransport {
    on<K extends keyof GitHubEventTransportEvents>(event: K, listener: GitHubEventTransportEvents[K]): this;
    emit<K extends keyof GitHubEventTransportEvents>(event: K, ...args: Parameters<GitHubEventTransportEvents[K]>): boolean;
}
/**
 * GitHubEventTransport - Handles forwarded GitHub webhook event delivery
 *
 * This class provides a typed EventEmitter-based transport
 * for handling GitHub webhooks forwarded from CYHOST.
 *
 * It registers a POST /github-webhook endpoint with a Fastify server
 * and verifies incoming webhooks using either:
 * 1. "proxy" mode: Verifies Bearer token authentication (self-hosted)
 * 2. "signature" mode: Verifies GitHub's HMAC-SHA256 signature (cloud)
 *
 * Supported GitHub event types:
 * - issue_comment: Comments on PR issues (top-level PR comments)
 * - pull_request_review_comment: Inline review comments on PR diffs
 * - pull_request_review: PR review submissions (e.g., changes_requested)
 * - push: Branch push events (used for base branch change notifications)
 */
export declare class GitHubEventTransport extends EventEmitter {
    private config;
    private logger;
    private messageTranslator;
    private translationContext;
    constructor(config: GitHubEventTransportConfig, logger?: ILogger, translationContext?: TranslationContext);
    /**
     * Set the translation context for message translation.
     */
    setTranslationContext(context: TranslationContext): void;
    /**
     * Resolve the effective verification mode and secret at request time.
     * When started in proxy mode, checks if GITHUB_WEBHOOK_SECRET and
     * CYRUS_HOST_EXTERNAL have been added to the environment since startup,
     * enabling a runtime switch to signature verification.
     *
     * Encapsulates all mode-switch detection and logging so callers only
     * need to dispatch on the returned mode (SRP).
     */
    private resolveVerification;
    /**
     * Register the /github-webhook endpoint with the Fastify server
     */
    register(): void;
    /**
     * Handle webhook using GitHub's HMAC-SHA256 signature verification
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
     * Only emits if translation succeeds; logs debug message on failure.
     */
    private emitMessage;
    /**
     * Verify GitHub webhook signature using HMAC-SHA256
     */
    private verifyGitHubSignature;
}
//# sourceMappingURL=GitHubEventTransport.d.ts.map