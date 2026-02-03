import type { SDKMessage } from "cyrus-core";
import { type SimpleAgentQueryOptions, SimpleAgentRunner } from "cyrus-simple-agent-runner";
/**
 * Concrete implementation using GeminiRunner from cyrus-gemini-runner package.
 *
 * This implementation uses the Gemini CLI to execute queries and
 * constrains the responses to an enumerated set.
 */
export declare class SimpleGeminiRunner<T extends string> extends SimpleAgentRunner<T> {
    /**
     * Execute the agent using GeminiRunner
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
//# sourceMappingURL=SimpleGeminiRunner.d.ts.map