import type { SDKAssistantMessage, SDKMessage, SDKUserMessage } from "cyrus-core";
import type { GeminiStreamEvent } from "./types.js";
/**
 * Convert a Gemini stream event to cyrus-core SDKMessage format
 *
 * This adapter maps Gemini CLI's streaming events to the cyrus-core SDKMessage
 * format, allowing GeminiRunner to implement the IAgentRunner interface.
 *
 * NOTE: This adapter is stateless and creates a separate SDK message for each event.
 * For delta messages (message events with delta: true), the caller (GeminiRunner)
 * should accumulate multiple delta events into a single message before emitting.
 *
 * @param event - Gemini CLI stream event
 * @param sessionId - Current session ID (may be null initially)
 * @param lastAssistantMessage - Last assistant message for result coercion (optional)
 * @returns SDKMessage or null if event type doesn't map to a message
 */
export declare function geminiEventToSDKMessage(event: GeminiStreamEvent, sessionId: string | null, lastAssistantMessage?: SDKAssistantMessage | null): SDKMessage | null;
/**
 * Create a Cyrus Core SDK UserMessage from a plain string prompt
 *
 * Helper function to create properly formatted SDKUserMessage objects
 * for the Gemini CLI input.
 *
 * @param content - The prompt text
 * @param sessionId - Current session ID (may be null for initial message)
 * @returns Formatted SDKUserMessage
 */
export declare function createUserMessage(content: string, sessionId: string | null): SDKUserMessage;
/**
 * Extract session ID from Gemini init event
 *
 * @param event - Gemini stream event
 * @returns Session ID if event is init type, null otherwise
 */
export declare function extractSessionId(event: GeminiStreamEvent): string | null;
//# sourceMappingURL=adapters.d.ts.map