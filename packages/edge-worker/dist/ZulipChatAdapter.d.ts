import type { IAgentRunner, ILogger } from "cyrus-core";
import { ZulipMessageService, type ZulipWebhookEvent } from "cyrus-zulip-event-transport";
import type { ChatRepositoryProvider } from "./ChatRepositoryProvider.js";
import type { ChatPlatformAdapter } from "./ChatSessionHandler.js";
/** Reaction added when a message is received and queued for processing (👀) */
export declare const RECEIPT_REACTION = "eyes";
/**
 * Reaction that replaces the receipt one once the agent finished its turn (✅).
 *
 * Zulip's name for U+2705 is `check`, not the `white_check_mark` that Slack
 * and GitHub use — Zulip rejects an unknown name with a 400, and
 * `check_mark` is a different emoji (U+2714 ✔️).
 */
export declare const PROCESSED_REACTION = "check";
/**
 * Zulip implementation of ChatPlatformAdapter.
 *
 * A Zulip topic is the thread unit, so a channel message's thread key is
 * `<stream_id>:<topic>`; a DM conversation keys on its participants instead.
 *
 * Unlike Slack, an outgoing webhook bot is only notified about messages that
 * address it (an @mention or a DM), so every event Cyrus sees is directed at
 * it. That removes the whole "decide whether this message was meant for you"
 * apparatus the Slack prompt needs — and it is why the catch-up read matters:
 * it is the only way anything said in the topic between two mentions reaches
 * the agent.
 */
export declare class ZulipChatAdapter implements ChatPlatformAdapter<ZulipWebhookEvent> {
    readonly platformName: "zulip";
    private repositoryProvider;
    private repositoryRoutingContext;
    private messageService;
    private logger;
    constructor(repositoryProvider: ChatRepositoryProvider, logger?: ILogger, options?: {
        repositoryRoutingContext?: string;
        messageService?: ZulipMessageService;
    });
    extractTaskInstructions(event: ZulipWebhookEvent): string;
    getThreadKey(event: ZulipWebhookEvent): string;
    getEventId(event: ZulipWebhookEvent): string;
    /**
     * Only channel topics get a catch-up cursor. Every DM sent to the bot
     * triggers the webhook, so a DM session has already seen its whole
     * conversation and re-reading it would only duplicate context.
     */
    getThreadContextTs(event: ZulipWebhookEvent): string | undefined;
    /**
     * What was said in this topic since Cyrus last had context.
     *
     * One request either way: the newest window of the topic, from which the
     * cursor selects what the agent has not seen. A resumed session already
     * holds its own replies in memory, so those are dropped from a catch-up —
     * but a fresh session has no memory at all and gets the whole window,
     * Cyrus's own past replies included.
     *
     * Returns "" when there is nothing to add, `null` when the read failed —
     * the caller only advances its cursor on a non-null result, so a failure
     * retries the same window on the next mention instead of losing it.
     */
    fetchThreadContext(event: ZulipWebhookEvent, sinceTs?: string): Promise<string | null>;
    buildSystemPrompt(event: ZulipWebhookEvent): string;
    postReply(event: ZulipWebhookEvent, runner: IAgentRunner): Promise<void>;
    acknowledgeReceipt(event: ZulipWebhookEvent): Promise<void>;
    /**
     * Swap the receipt reaction (👀) for a processed one (✅) once the agent
     * has finished its turn for this message.
     */
    acknowledgeProcessed(event: ZulipWebhookEvent): Promise<void>;
    postNotice(event: ZulipWebhookEvent, text: string): Promise<void>;
    notifyBusy(event: ZulipWebhookEvent): Promise<void>;
    /** Where a reply to this message should go */
    private destinationFor;
    /** Participants of a DM conversation, sorted so the key is stable */
    private recipientIds;
    /**
     * The topic's name with any resolved marker removed, for identity only.
     *
     * Every call that actually addresses Zulip — posting a reply, narrowing a
     * history read — uses the raw subject instead, because that is the topic's
     * real name right now.
     */
    private unresolvedTopic;
    /** Channel name of a channel message, needed to build a narrow */
    private channelName;
    private parseCursor;
    private formatTopicContext;
}
//# sourceMappingURL=ZulipChatAdapter.d.ts.map