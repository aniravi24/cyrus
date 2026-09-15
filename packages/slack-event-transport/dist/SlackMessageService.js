/**
 * Service for posting messages to Slack channels.
 *
 * Uses the Slack Web API with a bot token to post messages,
 * typically used to reply to @mention webhooks in a thread.
 */
export class SlackMessageService {
    apiBaseUrl;
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl ?? "https://slack.com/api";
    }
    /**
     * Post a message to a Slack channel.
     *
     * @see https://api.slack.com/methods/chat.postMessage
     */
    async postMessage(params) {
        const { token, channel, text, thread_ts } = params;
        const url = `${this.apiBaseUrl}/chat.postMessage`;
        const body = { channel, text };
        if (thread_ts) {
            body.thread_ts = thread_ts;
        }
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[SlackMessageService] Failed to post message: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        // Slack API returns HTTP 200 even for errors — check the response body
        const responseBody = (await response.json());
        if (!responseBody.ok) {
            throw new Error(`[SlackMessageService] Slack API error: ${responseBody.error ?? "unknown"}`);
        }
    }
    /**
     * Get the bot's own identity (bot_id, user_id) via auth.test.
     *
     * @see https://api.slack.com/methods/auth.test
     */
    async getIdentity(token) {
        const url = `${this.apiBaseUrl}/auth.test`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[SlackMessageService] Failed to get identity: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        const responseBody = (await response.json());
        if (!responseBody.ok) {
            throw new Error(`[SlackMessageService] Slack API error: ${responseBody.error ?? "unknown"}`);
        }
        return { bot_id: responseBody.bot_id, user_id: responseBody.user_id };
    }
    /**
     * Fetch all messages in a Slack thread using cursor-based pagination.
     *
     * @see https://api.slack.com/methods/conversations.replies
     */
    async fetchThreadMessages(params) {
        const { token, channel, thread_ts, limit = 100, oldest } = params;
        const messages = [];
        let cursor;
        while (messages.length < limit) {
            const queryParams = new URLSearchParams({
                channel,
                ts: thread_ts,
                limit: String(Math.min(limit - messages.length, 200)),
            });
            if (oldest) {
                queryParams.set("oldest", oldest);
            }
            if (cursor) {
                queryParams.set("cursor", cursor);
            }
            const url = `${this.apiBaseUrl}/conversations.replies?${queryParams.toString()}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`[SlackMessageService] Failed to fetch thread messages: ${response.status} ${response.statusText} - ${errorBody}`);
            }
            const responseBody = (await response.json());
            if (!responseBody.ok) {
                throw new Error(`[SlackMessageService] Slack API error: ${responseBody.error ?? "unknown"}`);
            }
            if (responseBody.messages) {
                messages.push(...responseBody.messages);
            }
            // Continue pagination if there are more messages
            const nextCursor = responseBody.response_metadata?.next_cursor;
            if (!responseBody.has_more || !nextCursor) {
                break;
            }
            cursor = nextCursor;
        }
        // Enforce limit
        return messages.slice(0, limit);
    }
}
//# sourceMappingURL=SlackMessageService.js.map