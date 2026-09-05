import type { SDKMessage } from "cyrus-core";
import { type SimpleAgentQueryOptions, SimpleAgentRunner } from "cyrus-simple-agent-runner";
/**
 * Concrete implementation using CodexRunner from cyrus-codex-runner package.
 *
 * This implementation uses the Codex SDK to execute queries and
 * constrains the responses to an enumerated set.
 * Uses structured outputs (outputSchema) for reliable response parsing.
 */
export declare class SimpleCodexRunner<T extends string> extends SimpleAgentRunner<T> {
    /**
     * Build a JSON Schema that constrains the model output to the valid responses.
     */
    private buildOutputSchema;
    /**
     * Execute the agent using CodexRunner
     */
    protected executeAgent(prompt: string, options?: SimpleAgentQueryOptions): Promise<SDKMessage[]>;
    /**
     * Extract the final response from the last assistant message.
     * Handles both structured JSON output and plain text responses.
     */
    protected extractResponse(messages: SDKMessage[]): string;
    /**
     * Try to parse a structured JSON response (from outputSchema).
     * Returns the classification value if valid, null otherwise.
     */
    private tryParseStructuredResponse;
    /**
     * Clean the response text to extract the actual value
     */
    private cleanResponse;
    /**
     * Handle incoming messages for progress events
     */
    private handleMessage;
}
//# sourceMappingURL=SimpleCodexRunner.d.ts.map