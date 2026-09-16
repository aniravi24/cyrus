/**
 * Service for posting and reading Zulip messages.
 *
 * Zulip's outgoing webhook protocol expects the bot's reply in the HTTP
 * response body, which cannot work for an agent turn that takes minutes.
 * Cyrus acknowledges the webhook immediately and everything after that —
 * the reply, the reactions, the catch-up read — goes through the REST API
 * with the bot's API key.
 *
 * @see https://zulip.com/api/send-message
 * @see https://zulip.com/api/get-messages
 */
import type { ZulipCredentials, ZulipMessage } from "./types.js";
/** Where a message should be posted */
export type ZulipDestination = {
    type: "stream";
    streamId: number;
    topic: string;
} | {
    type: "private";
    userIds: number[];
};
/** Parameters for posting a Zulip message */
export interface ZulipPostMessageParams {
    credentials: ZulipCredentials;
    destination: ZulipDestination;
    content: string;
}
/** Parameters for reading back a slice of a Zulip topic */
export interface ZulipFetchTopicParams {
    credentials: ZulipCredentials;
    /** Channel name — narrows require the name, not the ID */
    channel: string;
    /** Topic name */
    topic: string;
    /** Maximum number of messages to return, counted back from the newest */
    limit: number;
}
export declare class ZulipMessageService {
    /**
     * Post a message to a channel topic or a direct message conversation.
     */
    postMessage(params: ZulipPostMessageParams): Promise<number>;
    /**
     * Read the newest `limit` messages of a channel topic, oldest first.
     *
     * Always anchored at the newest end, never at a cursor. `num_before` is a
     * cap on what the server returns, not a window it scans, so the cost is
     * the same whether the topic holds fifty messages or fifty thousand — and
     * when a topic outgrows one window, what falls off is its oldest messages,
     * which is the right thing to lose. Anchoring at a cursor and walking
     * forward would truncate from the other end and drop the most recent
     * messages instead.
     *
     * Selecting what the caller has not already seen is its business: it holds
     * the cursor and knows which messages the agent already has in session.
     *
     * `apply_markdown=false` keeps the content as Zulip-flavored Markdown —
     * the default renders it to HTML, which is not what we want to hand an
     * agent.
     */
    fetchTopicMessages(params: ZulipFetchTopicParams): Promise<ZulipMessage[]>;
    /**
     * Add an emoji reaction to a message.
     *
     * Reactions are acknowledgement decoration: both call sites in
     * ChatSessionHandler are fire-and-forget, so a failure here is logged and
     * the turn carries on. That is why there is no special handling for
     * "already reacted" / "no such reaction" — they cannot arise from Cyrus's
     * own one-reaction-per-message usage, and if they somehow did, a warning
     * is the right outcome.
     *
     * @see https://zulip.com/api/add-reaction
     */
    addReaction(credentials: ZulipCredentials, messageId: number, emojiName: string): Promise<void>;
    /**
     * Remove an emoji reaction previously added by this bot.
     *
     * @see https://zulip.com/api/remove-reaction
     */
    removeReaction(credentials: ZulipCredentials, messageId: number, emojiName: string): Promise<void>;
    /**
     * Issue an authenticated request against the Zulip REST API.
     *
     * Zulip authenticates with HTTP Basic (bot email as the username, API key
     * as the password) and takes form-encoded parameters, not JSON.
     */
    protected request(credentials: ZulipCredentials, method: "GET" | "POST" | "DELETE", path: string, body?: URLSearchParams): Promise<Response>;
}
//# sourceMappingURL=ZulipMessageService.d.ts.map