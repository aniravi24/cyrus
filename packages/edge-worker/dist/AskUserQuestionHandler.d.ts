/**
 * Handler for AskUserQuestion tool invocations using Linear's select signal.
 *
 * This handler bridges the Claude SDK's AskUserQuestion tool with Linear's
 * agent elicitation API. When Claude uses the AskUserQuestion tool, this handler:
 * 1. Posts an elicitation activity to Linear with the question and options
 * 2. Stores the pending question with a promise resolver
 * 3. Waits for the "prompted" webhook event from Linear
 * 4. Resolves the promise with the user's response
 *
 * The handler follows the same pattern as RepositoryRouter for pending selections,
 * but is specifically designed for user questions during agent execution.
 *
 * @see {@link https://linear.app/developers/agent-signals#select}
 */
import type { AskUserQuestionInput, AskUserQuestionResult, IIssueTrackerService, ILogger } from "cyrus-core";
/**
 * Dependencies required by AskUserQuestionHandler
 */
export interface AskUserQuestionHandlerDeps {
    /**
     * Get issue tracker for a workspace
     * @param organizationId - Linear organization/workspace ID
     */
    getIssueTracker: (organizationId: string) => IIssueTrackerService | null;
}
/**
 * Configuration for AskUserQuestionHandler
 */
export interface AskUserQuestionHandlerConfig {
    /** Placeholder for future configuration. Set to undefined. */
    _placeholder?: undefined;
}
/**
 * Handler for presenting AskUserQuestion tool calls to users via Linear's select signal.
 *
 * Usage:
 * 1. Create handler instance with dependencies
 * 2. Call `handleAskUserQuestion()` when Claude uses the AskUserQuestion tool
 * 3. The handler posts an elicitation to Linear and returns a promise
 * 4. When the "prompted" webhook arrives, call `handleUserResponse()` to resolve the promise
 */
export declare class AskUserQuestionHandler {
    private deps;
    private logger;
    /**
     * Map of agent session ID to pending question data.
     * Used to track questions awaiting user response.
     */
    private pendingQuestions;
    constructor(deps: AskUserQuestionHandlerDeps, logger?: ILogger);
    /**
     * Handle an AskUserQuestion tool call by presenting it to the user via Linear.
     *
     * This method:
     * 1. Validates the input (only 1 question allowed)
     * 2. Posts an elicitation activity to Linear with the select signal
     * 3. Returns a promise that resolves when the user responds
     *
     * @param input - The AskUserQuestion tool input (must contain exactly 1 question)
     * @param linearAgentSessionId - Linear agent session ID (for tracking and API calls)
     * @param organizationId - Linear organization/workspace ID
     * @param signal - AbortSignal for cancellation
     * @returns Promise resolving to the user's answer or denial
     */
    handleAskUserQuestion(input: AskUserQuestionInput, linearAgentSessionId: string, organizationId: string, signal: AbortSignal): Promise<AskUserQuestionResult>;
    /**
     * Handle user response from the "prompted" webhook event.
     *
     * This method is called when Linear sends an AgentSessionPrompted webhook
     * in response to a select signal elicitation.
     *
     * @param linearAgentSessionId - Linear agent session ID
     * @param selectedValue - The value selected by the user (option label or free text)
     * @returns true if a pending question was resolved, false if no pending question found
     */
    handleUserResponse(linearAgentSessionId: string, selectedValue: string): boolean;
    /**
     * Check if there's a pending question for this agent session.
     *
     * @param linearAgentSessionId - Linear agent session ID
     * @returns true if there's a pending question
     */
    hasPendingQuestion(linearAgentSessionId: string): boolean;
    /**
     * Cancel a pending question.
     *
     * @param linearAgentSessionId - Linear agent session ID
     * @param reason - Reason for cancellation
     */
    cancelPendingQuestion(linearAgentSessionId: string, reason: string): void;
    /**
     * Get the number of pending questions (for debugging/monitoring).
     */
    get pendingCount(): number;
}
//# sourceMappingURL=AskUserQuestionHandler.d.ts.map