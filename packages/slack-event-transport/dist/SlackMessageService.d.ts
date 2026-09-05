/**
 * Service for posting messages to Slack channels.
 *
 * Uses the Slack Web API with a bot token to post messages,
 * typically used to reply to @mention webhooks in a thread.
 */
/**
 * A single message from a Slack thread (conversations.replies)
 */
export interface SlackThreadMessage {
    /** User ID who posted the message (absent for some bot messages) */
    user?: string;
    /** Message text */
    text: string;
    /** Message timestamp (unique ID) */
    ts: string;
    /** Bot ID if the message was posted by a bot */
    bot_id?: string;
    /** Message subtype (e.g., "bot_message") */
    subtype?: string;
}
/**
 * Parameters for fetching thread messages from Slack
 */
export interface SlackFetchThreadParams {
    /** Slack Bot OAuth token */
    token: string;
    /** Channel ID containing the thread */
    channel: string;
    /** Timestamp of the thread parent message */
    thread_ts: string;
    /** Maximum number of messages to fetch (default 100) */
    limit?: number;
    /**
     * Only fetch messages after this timestamp. Must be server-side: pagination
     * walks from the thread head, so a client-side filter would never reach
     * recent messages in a thread longer than `limit`.
     */
    oldest?: string;
}
/**
 * Parameters for posting a message to Slack
 */
export interface SlackPostMessageParams {
    /** Slack Bot OAuth token */
    token: string;
    /** Channel ID to post the message in */
    channel: string;
    /** Message text */
    text: string;
    /** Thread timestamp to reply in a thread */
    thread_ts?: string;
}
export declare class SlackMessageService {
    private apiBaseUrl;
    constructor(apiBaseUrl?: string);
    /**
     * Post a message to a Slack channel.
     *
     * @see https://api.slack.com/methods/chat.postMessage
     */
    postMessage(params: SlackPostMessageParams): Promise<void>;
    /**
     * Get the bot's own identity (bot_id, user_id) via auth.test.
     *
     * @see https://api.slack.com/methods/auth.test
     */
    getIdentity(token: string): Promise<{
        bot_id?: string;
        user_id: string;
    }>;
    /**
     * Fetch all messages in a Slack thread using cursor-based pagination.
     *
     * @see https://api.slack.com/methods/conversations.replies
     */
    fetchThreadMessages(params: SlackFetchThreadParams): Promise<SlackThreadMessage[]>;
}
//# sourceMappingURL=SlackMessageService.d.ts.map