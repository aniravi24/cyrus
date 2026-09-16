import { EventEmitter } from "node:events";
import { type ILogger } from "cyrus-core";
import type { ZulipEventTransportConfig, ZulipEventTransportEvents } from "./types.js";
export declare interface ZulipEventTransport {
    on<K extends keyof ZulipEventTransportEvents>(event: K, listener: ZulipEventTransportEvents[K]): this;
    emit<K extends keyof ZulipEventTransportEvents>(event: K, ...args: Parameters<ZulipEventTransportEvents[K]>): boolean;
}
/**
 * ZulipEventTransport - Handles Zulip outgoing webhook delivery
 *
 * Registers a POST /zulip-webhook endpoint with a Fastify server and verifies
 * incoming requests against the bot's fixed token.
 *
 * Two things differ from the Slack transport, both forced by Zulip's protocol:
 *
 * 1. **Verification is a token compare, not a signature check.** Zulip does
 *    not sign outgoing webhook requests; the payload carries the bot's fixed
 *    token and that is the only credential available. Deploy behind TLS.
 *
 * 2. **The reply does not go in the response.** Zulip expects the bot's answer
 *    in the HTTP response body, which cannot work for a turn that takes
 *    minutes. This transport always answers `response_not_required` right
 *    away and the reply is posted later through the REST API.
 *
 * An outgoing webhook bot is only notified about messages that address it —
 * an @mention in a channel, or a DM — so there is no equivalent of Slack's
 * plain `message` event and no passive thread following. Everything said in a
 * topic between two mentions is picked up by the catch-up read in
 * ZulipChatAdapter instead.
 *
 * @see https://zulip.com/api/outgoing-webhooks
 */
export declare class ZulipEventTransport extends EventEmitter {
    private config;
    private logger;
    constructor(config: ZulipEventTransportConfig, logger?: ILogger);
    /**
     * Register the /zulip-webhook endpoint with the Fastify server
     */
    register(): void;
    private handleWebhook;
    /**
     * Constant-time comparison of the payload token against the configured one.
     *
     * `timingSafeEqual` throws on a length mismatch, so that is checked first —
     * the length of a token is not a secret worth protecting.
     */
    private verifyToken;
    /**
     * Zulip sends `mention` and `direct_message`, but has historically used
     * other spellings (`private_message`) for the DM trigger, so both are
     * accepted. Anything else is ignored rather than guessed at.
     */
    private normalizeTrigger;
}
//# sourceMappingURL=ZulipEventTransport.d.ts.map