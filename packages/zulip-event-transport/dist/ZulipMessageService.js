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
export class ZulipMessageService {
    /**
     * Post a message to a channel topic or a direct message conversation.
     */
    async postMessage(params) {
        const { credentials, destination, content } = params;
        const body = new URLSearchParams({ content });
        if (destination.type === "stream") {
            body.set("type", "stream");
            body.set("to", String(destination.streamId));
            body.set("topic", destination.topic);
        }
        else {
            body.set("type", "private");
            body.set("to", JSON.stringify(destination.userIds));
        }
        const response = await this.request(credentials, "POST", "/api/v1/messages", body);
        const responseBody = (await response.json());
        return responseBody.id ?? 0;
    }
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
    async fetchTopicMessages(params) {
        const { credentials, channel, topic, limit } = params;
        const narrow = JSON.stringify([
            { operator: "channel", operand: channel },
            { operator: "topic", operand: topic },
        ]);
        const query = new URLSearchParams({
            narrow,
            apply_markdown: "false",
            anchor: "newest",
            num_before: String(limit),
            num_after: "0",
        });
        const response = await this.request(credentials, "GET", `/api/v1/messages?${query.toString()}`);
        const responseBody = (await response.json());
        return responseBody.messages ?? [];
    }
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
    async addReaction(credentials, messageId, emojiName) {
        await this.request(credentials, "POST", `/api/v1/messages/${messageId}/reactions`, new URLSearchParams({ emoji_name: emojiName }));
    }
    /**
     * Remove an emoji reaction previously added by this bot.
     *
     * @see https://zulip.com/api/remove-reaction
     */
    async removeReaction(credentials, messageId, emojiName) {
        const query = new URLSearchParams({ emoji_name: emojiName });
        await this.request(credentials, "DELETE", `/api/v1/messages/${messageId}/reactions?${query.toString()}`);
    }
    /**
     * Issue an authenticated request against the Zulip REST API.
     *
     * Zulip authenticates with HTTP Basic (bot email as the username, API key
     * as the password) and takes form-encoded parameters, not JSON.
     */
    async request(credentials, method, path, body) {
        const site = credentials.site.replace(/\/+$/, "");
        const auth = Buffer.from(`${credentials.botEmail}:${credentials.apiKey}`).toString("base64");
        const response = await fetch(`${site}${path}`, {
            method,
            headers: {
                Authorization: `Basic ${auth}`,
                ...(body
                    ? { "Content-Type": "application/x-www-form-urlencoded" }
                    : {}),
            },
            ...(body ? { body: body.toString() } : {}),
        });
        if (!response.ok) {
            const errorBody = (await response
                .json()
                .catch(() => ({})));
            throw new Error(`[ZulipMessageService] ${method} ${path} failed: ${response.status} ${response.statusText} - ${errorBody.msg ?? "unknown error"}`);
        }
        return response;
    }
}
//# sourceMappingURL=ZulipMessageService.js.map