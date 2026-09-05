import { EventEmitter } from "node:events";
import type { TranslationContext } from "cyrus-core";
import { type ILogger } from "cyrus-core";
import type { SlackEventTransportConfig, SlackEventTransportEvents } from "./types.js";
export declare interface SlackEventTransport {
    on<K extends keyof SlackEventTransportEvents>(event: K, listener: SlackEventTransportEvents[K]): this;
    emit<K extends keyof SlackEventTransportEvents>(event: K, ...args: Parameters<SlackEventTransportEvents[K]>): boolean;
}
/**
 * SlackEventTransport - Handles forwarded Slack webhook event delivery
 *
 * This class provides a typed EventEmitter-based transport
 * for handling Slack webhooks forwarded from CYHOST.
 *
 * It registers a POST /slack-webhook endpoint with a Fastify server
 * and verifies incoming webhooks using Bearer token authentication.
 *
 * Supported Slack event types:
 * - app_mention: When the bot is mentioned with @ in a channel or thread.
 *   Always emitted — starts or resumes a session for the thread.
 * - message: A plain message in a channel/thread the bot can see. Emitted only
 *   for threaded replies that aren't the bot's own message and aren't a
 *   subtype event (edits, joins, etc.). Whether it actually does anything is
 *   decided downstream (ChatSessionHandler only continues already-bound
 *   threads). Slack delivers both an `app_mention` AND a `message` event for a
 *   message that mentions the bot, so identical `(channel, ts)` pairs are
 *   de-duplicated here to avoid double-prompting.
 */
export declare class SlackEventTransport extends EventEmitter {
    private config;
    private logger;
    private messageTranslator;
    private translationContext;
    /**
     * Recently emitted `channel:ts` keys, used to collapse Slack's
     * double-delivery of app_mention + message for the same underlying message.
     * Maps key → epoch ms first seen; pruned by TTL.
     */
    private recentMessageKeys;
    private static readonly DEDUP_TTL_MS;
    constructor(config: SlackEventTransportConfig, logger?: ILogger, translationContext?: TranslationContext);
    /**
     * Set the translation context for message translation.
     */
    setTranslationContext(context: TranslationContext): void;
    /**
     * Get Slack bot token from the SLACK_BOT_TOKEN environment variable.
     */
    private getSlackBotToken;
    /**
     * Resolve the effective verification mode and secret at request time.
     * When started in proxy mode, checks if SLACK_SIGNING_SECRET and
     * CYRUS_HOST_EXTERNAL have been added to the environment since startup,
     * enabling a runtime switch to direct verification.
     *
     * Encapsulates all mode-switch detection and logging so callers only
     * need to dispatch on the returned mode (SRP).
     */
    private resolveVerification;
    /**
     * Register the /slack-webhook endpoint with the Fastify server
     */
    register(): void;
    /**
     * Handle webhook using Slack signing secret (direct from Slack)
     */
    private handleDirectWebhook;
    /**
     * Verify Slack request signature using HMAC-SHA256
     * @see https://api.slack.com/authentication/verifying-requests-from-slack
     */
    private verifySlackSignature;
    /**
     * Handle webhook using Bearer token authentication (forwarded from CYHOST)
     */
    private handleProxyWebhook;
    /**
     * Process the webhook request and emit the appropriate event
     */
    private processAndEmitEvent;
    /**
     * Decide whether a `message` event is a candidate follow-up prompt.
     *
     * Drops the bot's own messages (which would otherwise loop), edited/deleted
     * and other subtype events, and top-level (non-threaded) messages — only a
     * threaded reply can belong to a thread Cyrus is already bound to.
     */
    private shouldEmitMessageEvent;
    private isDuplicateMessage;
    private rememberMessage;
    private pruneRecentMessageKeys;
    /**
     * Translate and emit an internal message from a webhook event.
     * Only emits if translation succeeds; logs debug message on failure.
     */
    private emitMessage;
}
//# sourceMappingURL=SlackEventTransport.d.ts.map