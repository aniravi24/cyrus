import type { HookCallbackMatcher, HookEvent, JsonSchemaOutputFormat, McpServerConfig, OutputFormat, SDKAssistantMessage, SDKMessage, SDKResultMessage, SDKSystemMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { OnAskUserQuestion } from "cyrus-core";
export type { OnAskUserQuestion } from "cyrus-core";
/**
 * Output format configuration for structured outputs
 * Re-exported from Claude Agent SDK for convenience
 */
export type OutputFormatConfig = OutputFormat;
export interface ClaudeRunnerConfig {
    workingDirectory?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    allowedDirectories?: string[];
    resumeSessionId?: string;
    workspaceName?: string;
    systemPrompt?: string;
    appendSystemPrompt?: string;
    mcpConfigPath?: string | string[];
    mcpConfig?: Record<string, McpServerConfig>;
    model?: string;
    fallbackModel?: string;
    maxTurns?: number;
    cyrusHome: string;
    promptVersions?: {
        userPromptVersion?: string;
        systemPromptVersion?: string;
    };
    hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
    outputFormat?: OutputFormatConfig;
    extraArgs?: Record<string, string | null>;
    /**
     * Callback for handling AskUserQuestion tool invocations.
     * When provided, the ClaudeRunner will intercept AskUserQuestion tool calls
     * via the canUseTool callback and delegate to this handler.
     *
     * Note: Only one question at a time is supported. Multiple questions will be rejected.
     */
    onAskUserQuestion?: OnAskUserQuestion;
    onMessage?: (message: SDKMessage) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
    onComplete?: (messages: SDKMessage[]) => void | Promise<void>;
}
export interface ClaudeSessionInfo {
    sessionId: string | null;
    startedAt: Date;
    isRunning: boolean;
}
export interface ClaudeRunnerEvents {
    message: (message: SDKMessage) => void;
    assistant: (content: string) => void;
    "tool-use": (toolName: string, input: any) => void;
    text: (text: string) => void;
    "end-turn": (lastText: string) => void;
    error: (error: Error) => void | Promise<void>;
    complete: (messages: SDKMessage[]) => void | Promise<void>;
    /**
     * Emitted when a session resume fails because the session no longer exists.
     * This typically happens when a pod is restarted and the persisted session ID becomes stale.
     * The listener should handle recovery by clearing the stale session ID and retrying with context.
     */
    "resume-failed": (staleSessionId: string) => void;
}
export type { JsonSchemaOutputFormat, McpServerConfig, OutputFormat, SDKAssistantMessage, SDKMessage, SDKResultMessage, SDKStatusMessage, SDKSystemMessage, SDKUserMessage, } from "@anthropic-ai/claude-agent-sdk";
export type JsonSchema = JsonSchemaOutputFormat["schema"];
export type { Message as APIAssistantMessage, MessageParam as APIUserMessage, } from "@anthropic-ai/sdk/resources/messages.js";
export type ClaudeSystemMessage = SDKSystemMessage;
export type ClaudeUserMessage = SDKUserMessage;
export type ClaudeAssistantMessage = SDKAssistantMessage;
export type ClaudeResultMessage = SDKResultMessage;
//# sourceMappingURL=types.d.ts.map