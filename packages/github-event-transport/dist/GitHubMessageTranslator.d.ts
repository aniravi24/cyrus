/**
 * GitHub Message Translator
 *
 * Translates GitHub webhook events into unified internal messages for the
 * internal message bus.
 *
 * @module github-event-transport/GitHubMessageTranslator
 */
import type { IMessageTranslator, TranslationContext, TranslationResult } from "cyrus-core";
import type { GitHubWebhookEvent } from "./types.js";
/**
 * Translates GitHub webhook events into internal messages.
 *
 * Note: GitHub webhooks can result in either:
 * - SessionStartMessage: First mention/comment that starts a session
 * - UserPromptMessage: Follow-up comments in an existing session
 *
 * The distinction between session start vs user prompt is determined by
 * the EdgeWorker based on whether an active session exists for the PR.
 */
export declare class GitHubMessageTranslator implements IMessageTranslator<GitHubWebhookEvent> {
    /**
     * Check if this translator can handle the given event.
     */
    canTranslate(event: unknown): event is GitHubWebhookEvent;
    /**
     * Translate a GitHub webhook event into an internal message.
     *
     * By default, creates a SessionStartMessage. The EdgeWorker will
     * determine if this should actually be a UserPromptMessage based
     * on whether an active session exists.
     */
    translate(event: GitHubWebhookEvent, context?: TranslationContext): TranslationResult;
    /**
     * Translate issue_comment event to SessionStartMessage.
     */
    private translateIssueComment;
    /**
     * Translate pull_request_review_comment event to SessionStartMessage.
     */
    private translatePullRequestReviewComment;
    /**
     * Create a UserPromptMessage from a GitHub event.
     * This is called by EdgeWorker when it determines the message
     * is a follow-up to an existing session.
     */
    translateAsUserPrompt(event: GitHubWebhookEvent, context?: TranslationContext): TranslationResult;
    /**
     * Translate issue_comment as UserPromptMessage.
     */
    private translateIssueCommentAsUserPrompt;
    /**
     * Translate pull_request_review_comment as UserPromptMessage.
     */
    private translatePullRequestReviewCommentAsUserPrompt;
    /**
     * Translate pull_request_review event to SessionStartMessage.
     */
    private translatePullRequestReview;
    /**
     * Translate pull_request_review as UserPromptMessage.
     */
    private translatePullRequestReviewAsUserPrompt;
    /**
     * Build repository reference from webhook data.
     */
    private buildRepositoryRef;
    /**
     * Build issue reference from webhook data.
     */
    private buildIssueRef;
    /**
     * Build pull request reference from issue data (for issue comments on PRs).
     */
    private buildPullRequestFromIssue;
    /**
     * Build pull request reference from webhook data.
     */
    private buildPullRequestRef;
    /**
     * Build comment reference from webhook data.
     */
    private buildCommentRef;
    /**
     * Build comment reference from a pull_request_review review object.
     * Adapts the review shape into the common comment ref format.
     */
    private buildReviewAsCommentRef;
}
//# sourceMappingURL=GitHubMessageTranslator.d.ts.map