import crypto from "node:crypto";
import { cwd } from "node:process";
export const DEFAULT_CODEX_MODEL = "gpt-5.5";
const EMPTY_FALLBACK_CREDIT = { fallback_credit: null };
const NOT_APPLIED_FALLBACK_CREDIT = {
    fallback_credit: {
        status: { type: "not_applied", reason: "not_enabled" },
    },
};
function safeStringify(value) {
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
function asRecord(value) {
    if (value && typeof value === "object") {
        return value;
    }
    return null;
}
function normalizeError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "Codex execution failed";
}
function inferCommandToolName(command) {
    const normalized = command.toLowerCase();
    if (/\brg\b|\bgrep\b/.test(normalized)) {
        return "Grep";
    }
    if (/\bglob\.glob\b|\bfind\b.+\s-name\s/.test(normalized)) {
        return "Glob";
    }
    if (/\bcat\b/.test(normalized) && !/>/.test(normalized)) {
        return "Read";
    }
    if (/<<\s*['"]?eof['"]?\s*>/i.test(command) ||
        /\becho\b.+>/.test(normalized)) {
        return "Write";
    }
    return "Bash";
}
function normalizeFilePath(path, workingDirectory) {
    if (!path) {
        return path;
    }
    if (workingDirectory && path.startsWith(workingDirectory)) {
        // Lazy relative: strip the working-directory prefix without importing path.
        const rel = path.slice(workingDirectory.length).replace(/^[/\\]+/, "");
        if (rel && rel !== ".") {
            return rel;
        }
    }
    return path;
}
function summarizeFileChanges(item, workingDirectory) {
    if (!item.changes.length) {
        return item.status === "failed" ? "Patch failed" : "No file changes";
    }
    return item.changes
        .map((change) => {
        const filePath = normalizeFilePath(change.path, workingDirectory);
        return `${change.kind} ${filePath}`;
    })
        .join("\n");
}
function toMcpResultString(item) {
    if (item.error?.message) {
        return item.error.message;
    }
    const textBlocks = [];
    for (const block of item.result?.content || []) {
        const text = asRecord(block)?.text;
        if (typeof text === "string" && text.trim().length > 0) {
            textBlocks.push(text);
        }
    }
    if (textBlocks.length > 0) {
        return textBlocks.join("\n");
    }
    if (item.result?.structured_content !== undefined) {
        return safeStringify(item.result.structured_content);
    }
    return item.status === "failed"
        ? "MCP tool call failed"
        : "MCP tool call completed";
}
function normalizeMcpIdentifier(value) {
    const normalized = value
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return normalized || "unknown";
}
function emptyUsageBlock() {
    return {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        ...EMPTY_FALLBACK_CREDIT,
        output_tokens_details: null,
        cache_creation: null,
        inference_geo: null,
        iterations: null,
        server_tool_use: null,
        service_tier: null,
        speed: null,
    };
}
function createAssistantToolUseMessage(toolUseId, toolName, toolInput, messageId = crypto.randomUUID()) {
    const contentBlocks = [
        { type: "tool_use", id: toolUseId, name: toolName, input: toolInput },
    ];
    return {
        id: messageId,
        type: "message",
        role: "assistant",
        content: contentBlocks,
        model: DEFAULT_CODEX_MODEL,
        stop_reason: null,
        stop_sequence: null,
        stop_details: null,
        usage: emptyUsageBlock(),
        container: null,
        context_management: null,
        diagnostics: null,
    };
}
function createUserToolResultMessage(toolUseId, result, isError) {
    const contentBlocks = [
        {
            type: "tool_result",
            tool_use_id: toolUseId,
            content: result,
            is_error: isError,
        },
    ];
    return { role: "user", content: contentBlocks };
}
function createAssistantBetaMessage(content, messageId = crypto.randomUUID()) {
    const contentBlocks = [
        { type: "text", text: content },
    ];
    return {
        id: messageId,
        type: "message",
        role: "assistant",
        content: contentBlocks,
        model: DEFAULT_CODEX_MODEL,
        stop_reason: null,
        stop_sequence: null,
        stop_details: null,
        usage: emptyUsageBlock(),
        container: null,
        context_management: null,
        diagnostics: null,
    };
}
function createResultUsage(parsed) {
    return {
        input_tokens: parsed.input_tokens,
        output_tokens: parsed.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: parsed.cached_input_tokens,
        ...NOT_APPLIED_FALLBACK_CREDIT,
        output_tokens_details: { thinking_tokens: 0 },
        cache_creation: {
            ephemeral_1h_input_tokens: 0,
            ephemeral_5m_input_tokens: 0,
        },
        inference_geo: "unknown",
        iterations: [],
        server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
        service_tier: "standard",
        speed: "standard",
    };
}
/**
 * Translates backend-neutral {@link NormalizedCodexEvent}s into Cyrus
 * `SDKMessage`s and accumulates the session message list. Single responsibility:
 * event → message mapping. Knows nothing about transports or session lifecycle.
 */
export class CodexEventMapper {
    ctx;
    messages = [];
    hasInitMessage = false;
    pendingResultMessage = null;
    lastAssistantText = null;
    lastUsage = {
        input_tokens: 0,
        output_tokens: 0,
        cached_input_tokens: 0,
    };
    errorMessages = [];
    startTimestampMs = 0;
    emittedToolUseIds = new Set();
    constructor(ctx) {
        this.ctx = ctx;
    }
    reset() {
        this.messages = [];
        this.hasInitMessage = false;
        this.pendingResultMessage = null;
        this.lastAssistantText = null;
        this.lastUsage = {
            input_tokens: 0,
            output_tokens: 0,
            cached_input_tokens: 0,
        };
        this.errorMessages = [];
        this.startTimestampMs = Date.now();
        this.emittedToolUseIds.clear();
    }
    getMessages() {
        return [...this.messages];
    }
    handle(event) {
        switch (event.kind) {
            case "thread-started": {
                this.ctx.onThreadStarted(event.threadId);
                this.emitSystemInitMessage(event.threadId);
                break;
            }
            case "item-completed": {
                if (event.item.type === "agent_message") {
                    this.emitAssistantMessage(event.item.text);
                }
                else {
                    this.emitToolMessagesForItem(event.item, true);
                }
                break;
            }
            case "item-started": {
                this.emitToolMessagesForItem(event.item, false);
                break;
            }
            case "turn-completed": {
                this.lastUsage = event.usage;
                this.pendingResultMessage = this.createSuccessResultMessage(this.lastAssistantText || "Codex session completed successfully");
                break;
            }
            case "turn-failed": {
                const message = event.message ||
                    this.errorMessages.at(-1) ||
                    "Codex execution failed";
                this.errorMessages.push(message);
                this.pendingResultMessage = this.createErrorResultMessage(message);
                break;
            }
            case "error": {
                this.errorMessages.push(event.message);
                break;
            }
        }
    }
    /**
     * Build and emit the terminal result message (and init, if a turn never
     * started). Returns the full message list for the runner's `complete` event.
     */
    finalize(opts) {
        if (!this.hasInitMessage) {
            this.emitSystemInitMessage(this.ctx.getSessionId());
        }
        if (opts.caughtError && !opts.wasStopped) {
            this.errorMessages.push(normalizeError(opts.caughtError));
        }
        if (!this.pendingResultMessage && !opts.wasStopped) {
            this.pendingResultMessage = opts.caughtError
                ? this.createErrorResultMessage(this.errorMessages.at(-1) || "Codex execution failed")
                : this.createSuccessResultMessage(this.lastAssistantText || "Codex session completed successfully");
        }
        if (this.pendingResultMessage) {
            this.pushAndEmit(this.pendingResultMessage);
            this.pendingResultMessage = null;
        }
        return this.getMessages();
    }
    pushAndEmit(message) {
        this.messages.push(message);
        this.ctx.emitMessage(message);
    }
    projectItemToTool(item) {
        switch (item.type) {
            case "command_execution": {
                const isError = item.status === "failed" ||
                    (typeof item.exit_code === "number" && item.exit_code !== 0);
                const result = item.aggregated_output?.trim() ||
                    (isError
                        ? `Command failed (exit code ${item.exit_code ?? "unknown"})`
                        : "Command completed with no output");
                return {
                    toolUseId: item.id,
                    toolName: inferCommandToolName(item.command),
                    toolInput: { command: item.command },
                    result,
                    isError,
                };
            }
            case "file_change": {
                const primaryPath = item.changes[0]?.path &&
                    normalizeFilePath(item.changes[0].path, this.ctx.workingDirectory);
                return {
                    toolUseId: item.id,
                    toolName: "Edit",
                    toolInput: {
                        ...(primaryPath ? { file_path: primaryPath } : {}),
                        changes: item.changes.map((change) => ({
                            kind: change.kind,
                            path: normalizeFilePath(change.path, this.ctx.workingDirectory),
                        })),
                    },
                    result: summarizeFileChanges(item, this.ctx.workingDirectory),
                    isError: item.status === "failed",
                };
            }
            case "web_search": {
                const action = asRecord(item.action);
                const actionType = typeof action?.type === "string" ? action.type : undefined;
                const isFetch = actionType === "open_page";
                const url = typeof action?.url === "string" ? action.url : undefined;
                const pattern = typeof action?.pattern === "string" ? action.pattern : undefined;
                return {
                    toolUseId: item.id,
                    toolName: isFetch ? "WebFetch" : "WebSearch",
                    toolInput: isFetch
                        ? { url: url || item.query, ...(pattern ? { pattern } : {}) }
                        : { query: item.query },
                    result: action && Object.keys(action).length > 0
                        ? safeStringify(action)
                        : `Search completed for query: ${item.query}`,
                    isError: false,
                };
            }
            case "mcp_tool_call": {
                return {
                    toolUseId: item.id,
                    toolName: `mcp__${normalizeMcpIdentifier(item.server)}__${normalizeMcpIdentifier(item.tool)}`,
                    toolInput: asRecord(item.arguments) || { arguments: item.arguments },
                    result: toMcpResultString(item),
                    isError: item.status === "failed" || Boolean(item.error),
                };
            }
            case "todo_list": {
                return {
                    toolUseId: item.id,
                    toolName: "TodoWrite",
                    toolInput: {
                        todos: item.items.map((todo) => ({
                            content: todo.text,
                            status: todo.completed ? "completed" : "pending",
                        })),
                    },
                    result: `Updated todo list (${item.items.length} items)`,
                    isError: false,
                };
            }
            default:
                return null;
        }
    }
    emitToolMessagesForItem(item, includeResult) {
        const projection = this.projectItemToTool(item);
        if (!projection) {
            return;
        }
        if (!this.emittedToolUseIds.has(projection.toolUseId)) {
            const assistantMessage = {
                type: "assistant",
                message: createAssistantToolUseMessage(projection.toolUseId, projection.toolName, projection.toolInput),
                parent_tool_use_id: null,
                uuid: crypto.randomUUID(),
                session_id: this.ctx.getSessionId(),
            };
            this.pushAndEmit(assistantMessage);
            this.emittedToolUseIds.add(projection.toolUseId);
        }
        if (!includeResult) {
            return;
        }
        const userMessage = {
            type: "user",
            message: createUserToolResultMessage(projection.toolUseId, projection.result, projection.isError),
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.ctx.getSessionId(),
        };
        this.pushAndEmit(userMessage);
        this.emittedToolUseIds.delete(projection.toolUseId);
    }
    emitAssistantMessage(text) {
        const normalized = text.trim();
        if (!normalized) {
            return;
        }
        this.lastAssistantText = normalized;
        const assistantMessage = {
            type: "assistant",
            message: createAssistantBetaMessage(normalized),
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.ctx.getSessionId(),
        };
        this.pushAndEmit(assistantMessage);
    }
    emitSystemInitMessage(sessionId) {
        if (this.hasInitMessage) {
            return;
        }
        this.hasInitMessage = true;
        const initMessage = {
            type: "system",
            subtype: "init",
            agents: undefined,
            apiKeySource: "user",
            claude_code_version: "codex-cli",
            cwd: this.ctx.workingDirectory || cwd(),
            tools: [],
            mcp_servers: [],
            model: this.ctx.model || DEFAULT_CODEX_MODEL,
            permissionMode: "default",
            slash_commands: [],
            output_style: "default",
            skills: this.ctx.getStagedSkillNames(),
            plugins: [],
            uuid: crypto.randomUUID(),
            session_id: sessionId,
        };
        this.pushAndEmit(initMessage);
    }
    createSuccessResultMessage(result) {
        const durationMs = Math.max(Date.now() - this.startTimestampMs, 0);
        return {
            type: "result",
            subtype: "success",
            duration_ms: durationMs,
            duration_api_ms: 0,
            is_error: false,
            num_turns: 1,
            result,
            stop_reason: null,
            total_cost_usd: 0,
            usage: createResultUsage(this.lastUsage),
            modelUsage: {},
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.ctx.getSessionId(),
        };
    }
    createErrorResultMessage(errorMessage) {
        const durationMs = Math.max(Date.now() - this.startTimestampMs, 0);
        return {
            type: "result",
            subtype: "error_during_execution",
            duration_ms: durationMs,
            duration_api_ms: 0,
            is_error: true,
            num_turns: 1,
            stop_reason: null,
            errors: [errorMessage],
            total_cost_usd: 0,
            usage: createResultUsage(this.lastUsage),
            modelUsage: {},
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.ctx.getSessionId(),
        };
    }
}
//# sourceMappingURL=CodexEventMapper.js.map