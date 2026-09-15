/**
 * Slack Message Translator
 *
 * Translates Slack webhook events into unified internal messages for the
 * internal message bus.
 *
 * @module slack-event-transport/SlackMessageTranslator
 */
import type { IMessageTranslator, TranslationContext, TranslationResult } from "cyrus-core";
import type { SlackEventPayload, SlackWebhookEvent } from "./types.js";
/**
 * Strips the @mention from Slack message text.
 * Slack mentions are in the format <@U1234567890> at the start of the text.
 */
export declare function stripMention(text: string): string;
/**
 * Pulls each attachment's body out of `payload.attachments[]` (not in `text`)
 * as a labeled block. Falls back to `blocks`/`message_blocks` when `text` is empty.
 */
export declare function extractAttachmentContent(payload: SlackEventPayload): string;
/** User's own text (mention stripped) + any attachment content folded in. */
export declare function buildPromptText(payload: SlackEventPayload): string;
/**
 * Translates Slack webhook events into internal messages.
 *
 * Note: Slack webhooks can result in either:
 * - SessionStartMessage: First mention in a channel/thread that starts a session
 * - UserPromptMessage: Follow-up messages in an existing thread session
 *
 * The distinction between session start vs user prompt is determined by
 * the EdgeWorker based on whether an active session exists for the thread.
 */
export declare class SlackMessageTranslator implements IMessageTranslator<SlackWebhookEvent> {
    /**
     * Check if this translator can handle the given event.
     */
    canTranslate(event: unknown): event is SlackWebhookEvent;
    /**
     * Translate a Slack webhook event into an internal message.
     *
     * By default, creates a SessionStartMessage. The EdgeWorker will
     * determine if this should actually be a UserPromptMessage based
     * on whether an active session exists.
     */
    translate(event: SlackWebhookEvent, context?: TranslationContext): TranslationResult;
    /**
     * Create a UserPromptMessage from a Slack event.
     * This is called by EdgeWorker when it determines the message
     * is a follow-up to an existing session.
     */
    translateAsUserPrompt(event: SlackWebhookEvent, context?: TranslationContext): TranslationResult;
    /**
     * Translate app_mention event to SessionStartMessage.
     */
    private translateAppMention;
    /**
     * Translate app_mention as UserPromptMessage.
     */
    private translateAppMentionAsUserPrompt;
    /**
     * Build channel reference from channel ID.
     */
    private buildChannelRef;
    /**
     * Build thread reference from message timestamps.
     */
    private buildThreadRef;
    /**
     * Build message reference from event payload.
     */
    private buildMessageRef;
}
//# sourceMappingURL=SlackMessageTranslator.d.ts.map