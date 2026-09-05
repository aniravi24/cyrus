/**
 * GitLab Message Translator
 *
 * Translates GitLab webhook events into unified internal messages for the
 * internal message bus.
 *
 * @module gitlab-event-transport/GitLabMessageTranslator
 */
import type { IMessageTranslator, TranslationContext, TranslationResult } from "cyrus-core";
import type { GitLabWebhookEvent } from "./types.js";
/**
 * Translates GitLab webhook events into internal messages.
 *
 * Note: GitLab webhooks can result in either:
 * - SessionStartMessage: First mention/comment that starts a session
 * - UserPromptMessage: Follow-up comments in an existing session
 *
 * The distinction between session start vs user prompt is determined by
 * the EdgeWorker based on whether an active session exists for the MR.
 */
export declare class GitLabMessageTranslator implements IMessageTranslator<GitLabWebhookEvent> {
    /**
     * Check if this translator can handle the given event.
     */
    canTranslate(event: unknown): event is GitLabWebhookEvent;
    /**
     * Translate a GitLab webhook event into an internal message.
     *
     * By default, creates a SessionStartMessage. The EdgeWorker will
     * determine if this should actually be a UserPromptMessage based
     * on whether an active session exists.
     */
    translate(event: GitLabWebhookEvent, context?: TranslationContext): TranslationResult;
    /**
     * Translate note event to SessionStartMessage.
     */
    private translateNote;
    /**
     * Translate merge_request event to SessionStartMessage.
     */
    private translateMergeRequest;
    /**
     * Create a UserPromptMessage from a GitLab event.
     * This is called by EdgeWorker when it determines the message
     * is a follow-up to an existing session.
     */
    translateAsUserPrompt(event: GitLabWebhookEvent, context?: TranslationContext): TranslationResult;
    /**
     * Translate note as UserPromptMessage.
     */
    private translateNoteAsUserPrompt;
    /**
     * Build project reference from webhook data.
     */
    private buildProjectRef;
    /**
     * Build merge request reference from the embedded MR object in note payloads.
     */
    private buildMergeRequestRef;
    /**
     * Build merge request reference from merge_request event attributes.
     */
    private buildMergeRequestRefFromAttributes;
    /**
     * Build note reference from webhook data.
     */
    private buildNoteRef;
}
//# sourceMappingURL=GitLabMessageTranslator.d.ts.map