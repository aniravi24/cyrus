import { NoResponseError, SessionError, SimpleAgentRunner, } from "cyrus-simple-agent-runner";
import { CursorRunner } from "./CursorRunner.js";
/**
 * Concrete implementation using CursorRunner from cyrus-cursor-runner package.
 *
 * This implementation uses the Cursor CLI to execute queries and
 * constrains the responses to an enumerated set.
 *
 * Note: CursorRunner does not natively support a separate system prompt field,
 * so the constraint instructions are prepended to the user prompt.
 */
export class SimpleCursorRunner extends SimpleAgentRunner {
    /**
     * Execute the agent using CursorRunner
     */
    async executeAgent(prompt, options) {
        const messages = [];
        let sessionError = null;
        // Build the full prompt with context if provided
        let fullPrompt = options?.context
            ? `${options.context}\n\n${prompt}`
            : prompt;
        // CursorRunner doesn't support appendSystemPrompt, so prepend constraint to the prompt
        const systemPrompt = this.buildSystemPrompt();
        fullPrompt = `${systemPrompt}\n\n${fullPrompt}`;
        // Create CursorRunner with configuration
        const runner = new CursorRunner({
            workingDirectory: this.config.workingDirectory,
            cyrusHome: this.config.cyrusHome,
            model: this.config.model,
            fallbackModel: this.config.fallbackModel,
            maxTurns: this.config.maxTurns,
            // Limit tools for simple queries
            disallowedTools: options?.allowFileReading
                ? []
                : ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
            allowedDirectories: options?.allowedDirectories,
        });
        // Set up event handlers
        runner.on("message", (message) => {
            messages.push(message);
            this.handleMessage(message);
        });
        runner.on("error", (error) => {
            sessionError = error;
        });
        runner.on("complete", () => {
            this.emitProgress({ type: "validating", response: "complete" });
        });
        try {
            this.emitProgress({ type: "started", sessionId: null });
            await runner.start(fullPrompt);
            // Update session ID in progress events
            const sessionId = messages[0]?.session_id || null;
            if (sessionId) {
                this.emitProgress({ type: "started", sessionId });
            }
            if (sessionError) {
                throw new SessionError(sessionError, messages);
            }
            return messages;
        }
        catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new SessionError(new Error(String(error)), messages);
        }
    }
    /**
     * Extract the final response from the last assistant message
     */
    extractResponse(messages) {
        // Find the last assistant message with text content
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (!message)
                continue;
            if (message.type === "assistant" &&
                "message" in message &&
                message.message &&
                message.message.content) {
                // Extract text from content blocks
                for (const block of message.message.content) {
                    if (typeof block === "object" &&
                        block !== null &&
                        "type" in block &&
                        block.type === "text" &&
                        "text" in block) {
                        // Clean the response (remove whitespace, markdown, etc.)
                        const cleaned = this.cleanResponse(block.text);
                        if (cleaned) {
                            this.emitProgress({
                                type: "response-detected",
                                candidateResponse: cleaned,
                            });
                            return cleaned;
                        }
                    }
                }
            }
        }
        throw new NoResponseError(messages);
    }
    /**
     * Clean the response text to extract the actual value
     */
    cleanResponse(text) {
        // Remove markdown code blocks
        let cleaned = text.replace(/```[\s\S]*?```/g, "");
        // Remove inline code
        cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
        // Remove quotes
        cleaned = cleaned.replace(/^["']|["']$/g, "");
        // Trim whitespace
        cleaned = cleaned.trim();
        // If the response is multi-line, try to find a valid response on any line
        const lines = cleaned.split("\n").map((l) => l.trim());
        for (const line of lines) {
            if (this.isValidResponse(line)) {
                return line;
            }
        }
        // Return the cleaned text (will be validated by caller)
        return cleaned;
    }
    /**
     * Handle incoming messages for progress events
     */
    handleMessage(message) {
        if (message.type === "assistant" &&
            "message" in message &&
            message.message &&
            message.message.content) {
            for (const block of message.message.content) {
                if (typeof block === "object" && block !== null && "type" in block) {
                    if (block.type === "text" && "text" in block) {
                        this.emitProgress({ type: "thinking", text: block.text });
                    }
                    else if (block.type === "tool_use" &&
                        "name" in block &&
                        "input" in block) {
                        this.emitProgress({
                            type: "tool-use",
                            toolName: block.name,
                            input: block.input,
                        });
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=SimpleCursorRunner.js.map