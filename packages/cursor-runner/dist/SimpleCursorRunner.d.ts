import type { SDKMessage } from "cyrus-core";
import { type SimpleAgentQueryOptions, SimpleAgentRunner } from "cyrus-simple-agent-runner";
/**
 * Concrete implementation using CursorRunner from cyrus-cursor-runner package.
 *
 * This implementation uses the Cursor CLI to execute queries and
 * constrains the responses to an enumerated set.
 *
 * Note: CursorRunner does not natively support a separate system prompt field,
 * so the constraint instructions are prepended to the user prompt.
 */
export declare class SimpleCursorRunner<T extends string> extends SimpleAgentRunner<T> {
    /**
     * Execute the agent using CursorRunner
     */
    protected executeAgent(prompt: string, options?: SimpleAgentQueryOptions): Promise<SDKMessage[]>;
    /**
     * Extract the final response from the last assistant message
     */
    protected extractResponse(messages: SDKMessage[]): string;
    /**
     * Clean the response text to extract the actual value
     */
    private cleanResponse;
    /**
     * Handle incoming messages for progress events
     */
    private handleMessage;
}
//# sourceMappingURL=SimpleCursorRunner.d.ts.map