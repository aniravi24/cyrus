import type { IAgentRunner, ILogger } from "cyrus-core";
import { type SlackWebhookEvent } from "cyrus-slack-event-transport";
import type { ChatRepositoryProvider } from "./ChatRepositoryProvider.js";
import type { ChatPlatformAdapter } from "./ChatSessionHandler.js";
/**
 * Sentinel the agent emits when it has decided a Slack message does not warrant
 * a reply. `postReply` recognizes it and stays silent instead of posting.
 *
 * This is what makes the "only respond when relevant" policy in the system
 * prompt actually take effect: because every completed turn would otherwise be
 * posted back to the thread, the agent needs an explicit way to say "nothing to
 * post here". Kept as a single constant so the prompt and the suppression check
 * can never drift apart.
 */
export declare const SLACK_NO_RESPONSE_SENTINEL = "<<NO_RESPONSE>>";
/**
 * Route of the hosted Behaviours settings page (relative to the Cyrus app
 * base URL) where automatic Slack thread listening can be turned off.
 */
export declare const BEHAVIOURS_PAGE_ROUTE = "/settings/behaviours";
/** Reaction added when a message is received and queued for processing (👀) */
export declare const RECEIPT_REACTION = "eyes";
/** Reaction that replaces the receipt one once the agent finished its turn (✅) */
export declare const PROCESSED_REACTION = "white_check_mark";
/**
 * Slack implementation of ChatPlatformAdapter.
 *
 * Contains all Slack-specific logic extracted from EdgeWorker:
 * text extraction, thread keys, system prompts, thread context,
 * reply posting, and acknowledgement reactions.
 */
export declare class SlackChatAdapter implements ChatPlatformAdapter<SlackWebhookEvent> {
    readonly platformName: "slack";
    private repositoryProvider;
    private repositoryRoutingContext;
    private behavioursPageUrl;
    private logger;
    private selfBotId;
    constructor(repositoryProvider: ChatRepositoryProvider, logger?: ILogger, options?: {
        repositoryRoutingContext?: string;
        /**
         * Base URL of the hosted Cyrus app (e.g. https://app.atcyrus.com).
         * Only set for managed teams — community members have no Behaviours
         * page, so the system prompt omits the stop-listening guidance
         * entirely when this is empty. The Behaviours page URL is composed
         * from this base and BEHAVIOURS_PAGE_ROUTE.
         */
        cyrusAppBaseUrl?: string;
    });
    /**
     * Get the Slack bot token, falling back to process.env if the event doesn't carry one.
     *
     * The event's slackBotToken is set at webhook-reception time by SlackEventTransport.
     * During startup transitions (e.g. switching from cloud to self-host), the token may
     * not yet be in process.env when the event is created but may arrive shortly after
     * via an async env update. This fallback ensures the token is picked up even if
     * it was loaded into process.env after the event was created.
     */
    private getSlackBotToken;
    private getSelfBotId;
    extractTaskInstructions(event: SlackWebhookEvent): string;
    /**
     * Decide whether an event may start a session when the runtime has no
     * in-memory binding for its thread.
     *
     * - An explicit @mention always may.
     * - A plain `message` event may only when it was upstream-gated (proxy mode):
     *   CYHOST forwards `message` events solely for threads it has a persistent
     *   binding row for, so reaching us means the thread is genuinely bound. This
     *   is what lets Cyrus keep answering follow-ups after a process restart wipes
     *   the in-memory binding — the prior Slack thread is rehydrated via
     *   `fetchThreadContext`. In direct mode (`upstreamGated` false) there is no
     *   such guarantee, so an unbound plain message is ignored to avoid starting a
     *   session for arbitrary channel chatter.
     */
    isSessionInitiatingEvent(event: SlackWebhookEvent): boolean;
    getThreadKey(event: SlackWebhookEvent): string;
    getEventId(event: SlackWebhookEvent): string;
    buildSystemPrompt(event: SlackWebhookEvent): string;
    getThreadContextTs(event: SlackWebhookEvent): string | undefined;
    /**
     * Whole thread when `sinceTs` is absent, otherwise just what followed it.
     * With thread following disabled, untagged messages never reach us, so
     * everything said between two @mentions is invisible unless back-read here.
     *
     * "" when there is nothing to add, `null` when the read failed — the caller
     * only advances its cursor on a non-null result.
     */
    fetchThreadContext(event: SlackWebhookEvent, sinceTs?: string): Promise<string | null>;
    postReply(event: SlackWebhookEvent, runner: IAgentRunner): Promise<void>;
    acknowledgeReceipt(event: SlackWebhookEvent): Promise<void>;
    /**
     * Swap the receipt reaction (👀) for a processed one (✅) once the agent
     * has finished its turn for this message. This runs whether or not a reply
     * was posted, so users can tell a silently-skipped message was still seen.
     */
    acknowledgeProcessed(event: SlackWebhookEvent): Promise<void>;
    notifyBusy(event: SlackWebhookEvent): Promise<void>;
    private isSelfMessage;
    private formatThreadContext;
}
//# sourceMappingURL=SlackChatAdapter.d.ts.map