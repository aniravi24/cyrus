/**
 * Linear Message Translator
 *
 * Translates Linear webhook payloads into unified internal messages for the
 * internal message bus.
 *
 * @module linear-event-transport/LinearMessageTranslator
 */
import type { LinearWebhookPayload } from "@linear/sdk/webhooks";
import type { IMessageTranslator, TranslationContext, TranslationResult } from "cyrus-core";
/**
 * Translates Linear webhook payloads into internal messages.
 */
export declare class LinearMessageTranslator implements IMessageTranslator<LinearWebhookPayload> {
    /**
     * Check if this translator can handle the given webhook.
     */
    canTranslate(webhook: unknown): webhook is LinearWebhookPayload;
    /**
     * Translate a Linear webhook into an internal message.
     */
    translate(webhook: LinearWebhookPayload, context?: TranslationContext): TranslationResult;
    /**
     * Translate AgentSessionCreatedWebhook to SessionStartMessage.
     */
    private translateAgentSessionCreated;
    /**
     * Translate AgentSessionPromptedWebhook to UserPromptMessage or StopSignalMessage.
     */
    private translateAgentSessionPrompted;
    /**
     * Translate AgentSessionPromptedWebhook with stop signal to StopSignalMessage.
     */
    private translateStopSignal;
    /**
     * Translate IssueUnassignedWebhook to UnassignMessage.
     */
    private translateIssueUnassigned;
    /**
     * Translate IssueUpdateWebhook to ContentUpdateMessage.
     */
    private translateIssueUpdate;
    /**
     * Translate IssueStateChangeWebhook (AppUserNotification/issueStatusChanged) to IssueStateChangeMessage.
     *
     * Linear sends these notifications for terminal state changes (completed/canceled).
     * The notification payload does not include state info — only the issue reference.
     */
    private translateIssueStateChange;
    /**
     * Translate IssueDeletedWebhook (Issue/remove) to IssueStateChangeMessage.
     *
     * A deleted issue is effectively terminal — the same cleanup
     * (stop sessions, delete worktrees) should occur.
     */
    private translateIssueDeleted;
    /**
     * Build an IssueStateChangeMessage for an issue that has reached a terminal state.
     * Shared by state change (completed/canceled) and deletion translations.
     */
    private buildTerminalStateMessage;
    /**
     * Convert createdAt (Date or string) to ISO string.
     */
    private toISOString;
    /**
     * Build agent session reference from webhook data.
     */
    private buildAgentSessionRef;
    /**
     * Build issue reference from webhook issue data.
     * Uses SafeRecord to handle fields that may not exist in all webhook types.
     */
    private buildIssueRef;
    /**
     * Create an empty issue ref for cases where issue data is missing.
     */
    private emptyIssueRef;
    /**
     * Build comment reference from webhook comment data.
     */
    private buildCommentRef;
    /**
     * Build agent activity reference from webhook data.
     */
    private buildAgentActivityRef;
    /**
     * Build guidance item from webhook guidance rule.
     */
    private buildGuidanceItem;
    /**
     * Extract author from agent session (for session start).
     */
    private extractAuthorFromSession;
    /**
     * Extract author from agent activity (for prompts).
     */
    private extractAuthorFromActivity;
}
//# sourceMappingURL=LinearMessageTranslator.d.ts.map