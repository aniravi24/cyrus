import type { HookCallbackMatcher, HookEvent, JsonSchemaOutputFormat, McpServerConfig, OutputFormat, SandboxSettings, SDKAssistantMessage, SDKMessage, SDKResultMessage, SDKSystemMessage, SDKUserMessage, SdkPluginConfig, SessionStore, SpawnedProcess, SpawnOptions, WarmQuery } from "@anthropic-ai/claude-agent-sdk";
import type { ILogger, OnAskUserQuestion } from "cyrus-core";
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
    /**
     * Extra working-tree roots passed to the SDK `additionalDirectories` option
     * (the `--add-dir` flag). Beyond widening the permission scope, `--add-dir`
     * auto-loads each directory's `.claude/skills/` — the documented exception
     * that makes repo-local skills in multi-repo sub-worktrees discoverable.
     */
    additionalDirectories?: string[];
    resumeSessionId?: string;
    workspaceName?: string;
    systemPrompt?: string;
    appendSystemPrompt?: string;
    mcpConfigPath?: string | string[];
    mcpConfig?: Record<string, McpServerConfig>;
    /**
     * Only use MCP servers explicitly supplied by Cyrus. When false, Claude Code
     * may also load project/user MCP settings, plugins, and authenticated
     * claude.ai connectors. Defaults to true.
     */
    strictMcpConfig?: boolean;
    model?: string;
    fallbackModel?: string;
    effort?: string;
    maxTurns?: number;
    tools?: string[];
    cyrusHome: string;
    logger?: ILogger;
    promptVersions?: {
        userPromptVersion?: string;
        systemPromptVersion?: string;
    };
    hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
    plugins?: SdkPluginConfig[];
    /**
     * Filter which Skills the main session can invoke. Passed through to the
     * SDK's `query()` `skills` option.
     * - `undefined`: no SDK auto-configuration (CLI defaults apply).
     * - `'all'`: enable every discovered skill.
     * - `string[]`: enable only the listed skills (by SKILL.md `name` /
     *   directory name, or `plugin:skill` for plugin-qualified skills).
     *
     * This is a context filter, not a sandbox — unlisted skills are hidden from
     * the model's listing but the files remain on disk.
     */
    skills?: string[] | "all";
    outputFormat?: OutputFormatConfig;
    sandbox?: SandboxSettings;
    /** Additional environment variables to pass to the Claude child process (merged after process.env) */
    additionalEnv?: Record<string, string>;
    pathToClaudeCodeExecutable?: string;
    /**
     * Override how the Claude Code process is spawned. Forwarded to the SDK's
     * `query()` option of the same name. Lets the CLI run somewhere other than a
     * local child process — a container, a pod, a remote host — as long as the
     * returned object proxies stdin/stdout and exit.
     */
    spawnClaudeCodeProcess?: (options: SpawnOptions) => SpawnedProcess;
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
    /**
     * Pre-warmed session from startup() — when set, the first streaming query uses
     * this warm instance instead of spawning a cold process (~20x faster first turn).
     */
    warmSession?: WarmQuery;
    /**
     * Optional SessionStore that mirrors transcript entries to external storage.
     * Forwarded to the SDK's `query()` via `options.sessionStore`. Used to ship
     * session JSONL to the Cyrus hosted control plane so transcripts survive
     * the ephemeral worktree and can be resumed from any host.
     */
    sessionStore?: SessionStore;
    /**
     * Custom directory path for Claude's auto-memory storage. Forwarded to the
     * Claude SDK as settings.autoMemoryDirectory. When unset, the SDK falls
     * back to its default (~/.claude/projects/<sanitized-cwd>/memory/).
     */
    autoMemoryDirectory?: string;
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
export type { JsonSchemaOutputFormat, McpServerConfig, OutputFormat, SandboxSettings, SDKAssistantMessage, SDKMessage, SDKRateLimitEvent, SDKResultMessage, SDKStatusMessage, SDKSystemMessage, SDKUserMessage, SdkPluginConfig, SessionKey, SessionStore, SessionStoreEntry, } from "@anthropic-ai/claude-agent-sdk";
export type JsonSchema = JsonSchemaOutputFormat["schema"];
export type { BetaMessage as APIAssistantMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages.js";
export type { MessageParam as APIUserMessage } from "@anthropic-ai/sdk/resources/messages.js";
export type ClaudeSystemMessage = SDKSystemMessage;
export type ClaudeUserMessage = SDKUserMessage;
export type ClaudeAssistantMessage = SDKAssistantMessage;
export type ClaudeResultMessage = SDKResultMessage;
//# sourceMappingURL=types.d.ts.map