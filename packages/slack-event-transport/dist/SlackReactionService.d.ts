/**
 * Service for adding and removing reactions on Slack messages.
 *
 * Uses the Slack Web API with a bot token to manage emoji reactions,
 * typically used to acknowledge receipt of @mention webhooks and to
 * signal that a message has been processed.
 */
/**
 * Parameters for adding or removing a reaction on a Slack message
 */
export interface SlackReactionParams {
    /** Slack Bot OAuth token */
    token: string;
    /** Channel ID where the message is */
    channel: string;
    /** Timestamp of the message to react to */
    timestamp: string;
    /** Emoji name (without colons), e.g. "eyes" */
    name: string;
}
export declare class SlackReactionService {
    private apiBaseUrl;
    constructor(apiBaseUrl?: string);
    /**
     * Add a reaction to a Slack message.
     *
     * @see https://api.slack.com/methods/reactions.add
     */
    addReaction(params: SlackReactionParams): Promise<void>;
    /**
     * Remove a reaction from a Slack message.
     *
     * @see https://api.slack.com/methods/reactions.remove
     */
    removeReaction(params: SlackReactionParams): Promise<void>;
    private callReactionApi;
}
//# sourceMappingURL=SlackReactionService.d.ts.map