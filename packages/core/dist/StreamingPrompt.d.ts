import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
/**
 * Streaming prompt controller that implements AsyncIterable<SDKUserMessage>
 *
 * Provides a queue-based async iterator for streaming user messages to agent runners.
 * Used by both ClaudeRunner and GeminiRunner for streaming input support.
 */
export declare class StreamingPrompt {
    private messageQueue;
    private resolvers;
    private isComplete;
    private sessionId;
    constructor(sessionId: string | null, initialPrompt?: string);
    updateSessionId(sessionId: string): void;
    addMessage(content: string): void;
    complete(): void;
    get completed(): boolean;
    private processQueue;
    [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage>;
}
//# sourceMappingURL=StreamingPrompt.d.ts.map