import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { cwd } from "node:process";
import { buildOpenCodeConfig, buildOpenCodeRuntimeEnv, ensureOpenCodeStateDirectories, } from "./config.js";
import { OpenCodeMessageFormatter } from "./formatter.js";
const FORCE_KILL_DELAY_MS = 5_000;
const DEFAULT_OPENCODE_MODEL = "opencode";
const DEFAULT_OPENCODE_MODEL_DISPLAY = "OpenCode default model";
function asRecord(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    return null;
}
function safeStringify(value) {
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
function normalizeError(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "string")
        return error;
    return "OpenCode execution failed";
}
function toFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function inferToolNameFromInput(input) {
    const record = asRecord(input);
    if (!record) {
        return null;
    }
    if (typeof (record.command ?? record.cmd) === "string") {
        return "Bash";
    }
    if (typeof (record.filePath ?? record.file_path ?? record.path) === "string") {
        return "Read";
    }
    if (typeof record.url === "string") {
        return "WebFetch";
    }
    if (typeof (record.pattern ?? record.query) === "string") {
        return "Grep";
    }
    return null;
}
function normalizeToolName(toolName, input) {
    const trimmed = toolName?.trim() || "";
    if (!trimmed) {
        return "OpenCode tool call";
    }
    const inferredName = inferToolNameFromInput(input);
    if (trimmed.toLowerCase() === "unknown") {
        return inferredName || "OpenCode tool call";
    }
    const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, "");
    switch (normalized) {
        case "bash":
        case "shell":
        case "terminal":
            return "Bash";
        case "edit":
        case "patch":
            return "Edit";
        case "read":
            return "Read";
        case "write":
            return "Write";
        case "grep":
            return "Grep";
        case "glob":
            return "Glob";
        case "webfetch":
        case "fetch":
            return "WebFetch";
        case "websearch":
        case "search":
            return "WebSearch";
        case "todowrite":
        case "todolist":
            return "TodoWrite";
        default:
            return trimmed;
    }
}
function resolveModelDisplay(config) {
    if (config.model) {
        return config.model;
    }
    const runtimeConfig = buildOpenCodeConfig(config).config;
    const model = runtimeConfig.model;
    const provider = runtimeConfig.provider;
    if (typeof model === "string" && model.trim()) {
        if (typeof provider === "string" &&
            provider.trim() &&
            !model.includes("/")) {
            return `${provider}/${model}`;
        }
        return model;
    }
    return DEFAULT_OPENCODE_MODEL_DISPLAY;
}
function normalizeToolInput(input) {
    const record = asRecord(input);
    if (!record) {
        return {};
    }
    const normalized = { ...record };
    if (typeof record.filePath === "string" && !normalized.file_path) {
        normalized.file_path = record.filePath;
    }
    return normalized;
}
function outputToString(output, metadata) {
    if (typeof output === "string") {
        return output;
    }
    if (output !== undefined) {
        return safeStringify(output);
    }
    if (metadata !== undefined) {
        return safeStringify(metadata);
    }
    return "Tool completed";
}
function createAssistantToolUseMessage(toolUseId, toolName, toolInput, messageId = crypto.randomUUID()) {
    return {
        id: messageId,
        type: "message",
        role: "assistant",
        content: [
            { type: "tool_use", id: toolUseId, name: toolName, input: toolInput },
        ],
        model: DEFAULT_OPENCODE_MODEL,
        stop_reason: null,
        stop_sequence: null,
        stop_details: null,
        usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation: null,
        },
        container: null,
        context_management: null,
        diagnostics: null,
    };
}
function createAssistantTextMessage(text, messageId = crypto.randomUUID()) {
    return {
        id: messageId,
        type: "message",
        role: "assistant",
        content: [
            { type: "text", text },
        ],
        model: DEFAULT_OPENCODE_MODEL,
        stop_reason: null,
        stop_sequence: null,
        stop_details: null,
        usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation: null,
        },
        container: null,
        context_management: null,
        diagnostics: null,
    };
}
function createUserToolResultMessage(toolUseId, result, isError) {
    return {
        role: "user",
        content: [
            {
                type: "tool_result",
                tool_use_id: toolUseId,
                content: result,
                is_error: isError,
            },
        ],
    };
}
function createResultUsage(usage) {
    return {
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        cache_creation_input_tokens: usage.cacheWriteTokens,
        cache_read_input_tokens: usage.cacheReadTokens,
        cache_creation: {
            ephemeral_1h_input_tokens: 0,
            ephemeral_5m_input_tokens: 0,
        },
    };
}
function parseUsage(event) {
    const usage = event.usage || {};
    return {
        inputTokens: toFiniteNumber(usage.inputTokens ?? usage.input_tokens),
        outputTokens: toFiniteNumber(usage.outputTokens ?? usage.output_tokens),
        cacheReadTokens: toFiniteNumber(usage.cacheReadTokens ?? usage.cache_read_input_tokens),
        cacheWriteTokens: toFiniteNumber(usage.cacheWriteTokens ?? usage.cache_creation_input_tokens),
    };
}
function parseCost(event) {
    return toFiniteNumber(event.cost ?? event.totalCostUSD ?? event.total_cost_usd);
}
function parseFinalResult(event) {
    const value = event.result ?? event.output ?? event.message;
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed || null;
    }
    if (value !== undefined) {
        return safeStringify(value);
    }
    return null;
}
export class OpenCodeRunner extends EventEmitter {
    supportsStreamingInput = false;
    config;
    formatter;
    sessionInfo = null;
    messages = [];
    process = null;
    hasInitMessage = false;
    emittedToolUseIds = new Set();
    pendingResultMessage = null;
    lastAssistantText = null;
    lastUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
    };
    totalCostUsd = 0;
    startTimestampMs = 0;
    wasStopped = false;
    hasFinalized = false;
    stderr = "";
    nonJsonStartupOutput = [];
    constructor(config) {
        super();
        this.config = config;
        this.formatter = new OpenCodeMessageFormatter();
        if (config.onMessage)
            this.on("message", config.onMessage);
        if (config.onError)
            this.on("error", config.onError);
        if (config.onComplete)
            this.on("complete", config.onComplete);
    }
    async start(prompt) {
        if (this.isRunning()) {
            throw new Error("OpenCode session already running");
        }
        this.resetSessionState();
        this.sessionInfo = {
            sessionId: this.config.resumeSessionId || null,
            startedAt: new Date(),
            isRunning: true,
        };
        const selectorError = this.validateModelSelector();
        if (selectorError) {
            this.finalizeSession(selectorError);
            return this.sessionInfo;
        }
        return new Promise((resolve) => {
            let stdoutBuffer = "";
            let inactivityTimer;
            let forceKillTimer;
            const inactivityTimeoutMs = this.config.inactivityTimeoutMs;
            const args = this.buildArgs();
            const inputPrompt = this.buildInputPrompt(prompt);
            const runtimeEnv = this.buildRuntimeEnv();
            ensureOpenCodeStateDirectories(runtimeEnv);
            const child = spawn(this.config.openCodePath || "opencode", args, {
                cwd: this.config.workingDirectory || cwd(),
                env: {
                    ...process.env,
                    ...this.config.env,
                    ...runtimeEnv,
                },
                stdio: ["pipe", "pipe", "pipe"],
            });
            this.process = child;
            const clearInactivityTimers = () => {
                if (inactivityTimer)
                    clearTimeout(inactivityTimer);
                if (forceKillTimer)
                    clearTimeout(forceKillTimer);
            };
            const refreshInactivityTimer = () => {
                if (!inactivityTimeoutMs || inactivityTimeoutMs <= 0) {
                    return;
                }
                if (inactivityTimer)
                    clearTimeout(inactivityTimer);
                inactivityTimer = setTimeout(() => {
                    const timeoutDescription = inactivityTimeoutMs >= 60_000
                        ? `${Math.round(inactivityTimeoutMs / 60_000)} minutes`
                        : `${inactivityTimeoutMs}ms`;
                    const error = new Error(`OpenCode produced no output for ${timeoutDescription} and was terminated`);
                    this.finalizeSession(error);
                    resolve(this.sessionInfo);
                    child.kill("SIGTERM");
                    forceKillTimer = setTimeout(() => {
                        if (child.exitCode === null && child.signalCode === null) {
                            child.kill("SIGKILL");
                        }
                    }, FORCE_KILL_DELAY_MS);
                }, inactivityTimeoutMs);
            };
            refreshInactivityTimer();
            child.stdout.on("data", (chunk) => {
                refreshInactivityTimer();
                stdoutBuffer += chunk.toString("utf8");
                const lines = stdoutBuffer.split(/\r?\n/);
                stdoutBuffer = lines.pop() || "";
                for (const line of lines) {
                    this.handleLine(line);
                }
            });
            child.stderr.on("data", (chunk) => {
                refreshInactivityTimer();
                this.stderr += chunk.toString("utf8");
            });
            child.on("error", (error) => {
                clearInactivityTimers();
                this.finalizeSession(error);
                resolve(this.sessionInfo);
            });
            child.on("close", (code, signal) => {
                clearInactivityTimers();
                if (stdoutBuffer.trim()) {
                    this.handleLine(stdoutBuffer);
                }
                let error;
                if (this.wasStopped) {
                    error = new Error("OpenCode session stopped");
                }
                else if (typeof code === "number" && code !== 0) {
                    const output = this.stderr.trim() || this.nonJsonStartupOutput.join("\n").trim();
                    const suffix = output ? `: ${output}` : "";
                    error = new Error(`OpenCode exited with code ${code}${suffix}`);
                }
                else if (signal) {
                    error = new Error(`OpenCode exited with signal ${signal}`);
                }
                this.finalizeSession(error);
                resolve(this.sessionInfo);
            });
            child.stdin.end(inputPrompt);
        });
    }
    async startStreaming(initialPrompt) {
        return this.start(initialPrompt || "");
    }
    addStreamMessage(_content) {
        throw new Error("OpenCodeRunner does not support streaming input messages");
    }
    completeStream() {
        // No-op: OpenCodeRunner does not support streaming input.
    }
    stop() {
        if (!this.sessionInfo?.isRunning) {
            return;
        }
        this.wasStopped = true;
        this.process?.kill("SIGTERM");
    }
    isRunning() {
        return this.sessionInfo?.isRunning ?? false;
    }
    getMessages() {
        return [...this.messages];
    }
    getFormatter() {
        return this.formatter;
    }
    resetSessionState() {
        this.messages = [];
        this.process = null;
        this.hasInitMessage = false;
        this.emittedToolUseIds = new Set();
        this.pendingResultMessage = null;
        this.lastAssistantText = null;
        this.lastUsage = {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
        };
        this.totalCostUsd = 0;
        this.startTimestampMs = Date.now();
        this.wasStopped = false;
        this.hasFinalized = false;
        this.stderr = "";
        this.nonJsonStartupOutput = [];
    }
    validateModelSelector() {
        const model = this.config.model?.trim();
        if (!model?.toLowerCase().startsWith("opencode/")) {
            return undefined;
        }
        return new Error(`Invalid OpenCode model selector "${model}". Use a provider-qualified OpenCode model such as "openai/gpt-5.5" in runner config or select it with the Cyrus label "opencode/openai/gpt-5.5".`);
    }
    buildRuntimeEnv() {
        const built = buildOpenCodeConfig(this.config);
        for (const entry of built.unsupported) {
            console.warn(`[OpenCodeRunner] Unsupported config entry skipped: ${entry}`);
        }
        return buildOpenCodeRuntimeEnv(this.config);
    }
    buildArgs() {
        const args = [
            "run",
            "--format",
            "json",
            "--print-logs",
            "--log-level",
            "ERROR",
            "--dir",
            this.config.workingDirectory || cwd(),
            "--title",
            this.config.title || "Cyrus OpenCode session",
        ];
        if (this.config.model) {
            args.push("--model", this.config.model);
        }
        if (this.config.agent) {
            args.push("--agent", this.config.agent);
        }
        if (this.config.resumeSessionId) {
            args.push("--session", this.config.resumeSessionId);
        }
        return args;
    }
    buildInputPrompt(prompt) {
        const systemPrompt = this.config.appendSystemPrompt?.trim();
        if (!systemPrompt)
            return prompt;
        return `${systemPrompt}\n\n${prompt}`;
    }
    handleLine(line) {
        const trimmed = line.trim();
        if (!trimmed) {
            return;
        }
        try {
            this.handleEvent(JSON.parse(trimmed));
        }
        catch (error) {
            if (!this.hasInitMessage) {
                this.nonJsonStartupOutput.push(trimmed);
                return;
            }
            this.emitError(new Error(`Failed to parse OpenCode JSON event: ${normalizeError(error)} (${trimmed})`));
        }
    }
    handleEvent(event) {
        this.emit("streamEvent", event);
        switch (event.type) {
            case "step_start": {
                const sessionId = event.sessionID || event.sessionId || event.session_id || "pending";
                if (this.sessionInfo) {
                    this.sessionInfo.sessionId = sessionId;
                }
                this.emitSystemInitMessage(sessionId);
                break;
            }
            case "tool_use":
                this.emitToolMessages(event);
                break;
            case "text":
                this.emitAssistantMessage(event.part?.text || "");
                break;
            case "step_finish":
                this.lastUsage = parseUsage(event);
                this.totalCostUsd = parseCost(event);
                this.pendingResultMessage = this.createSuccessResultMessage(parseFinalResult(event) ||
                    this.lastAssistantText ||
                    "OpenCode session completed successfully", event.reason || event.stopReason || event.stop_reason || null);
                break;
            default:
                break;
        }
    }
    projectToolUse(event) {
        const part = event.part;
        const callId = part?.callID || part?.callId || part?.call_id;
        if (!callId) {
            return null;
        }
        const state = part.state || {};
        const status = (state.status || "").toLowerCase();
        const isError = status === "error" ||
            status === "failed" ||
            status === "aborted" ||
            status === "canceled" ||
            status === "cancelled" ||
            state.error !== undefined;
        const hasResult = state.output !== undefined ||
            state.metadata !== undefined ||
            isError ||
            status === "completed" ||
            status === "success";
        return {
            toolUseId: callId,
            toolName: normalizeToolName(part.tool, state.input),
            toolInput: normalizeToolInput(state.input),
            result: outputToString(state.output ?? state.error, state.metadata),
            isError,
            hasResult,
        };
    }
    emitToolMessages(event) {
        const projection = this.projectToolUse(event);
        if (!projection) {
            return;
        }
        if (!this.emittedToolUseIds.has(projection.toolUseId)) {
            const message = {
                type: "assistant",
                message: createAssistantToolUseMessage(projection.toolUseId, projection.toolName, projection.toolInput),
                parent_tool_use_id: null,
                uuid: crypto.randomUUID(),
                session_id: this.sessionInfo?.sessionId || "pending",
            };
            this.pushMessage(message);
            this.emittedToolUseIds.add(projection.toolUseId);
        }
        if (!projection.hasResult) {
            return;
        }
        const message = {
            type: "user",
            message: createUserToolResultMessage(projection.toolUseId, projection.result, projection.isError),
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
        };
        this.pushMessage(message);
        this.emittedToolUseIds.delete(projection.toolUseId);
    }
    emitAssistantMessage(text) {
        const normalized = text.trim();
        if (!normalized) {
            return;
        }
        this.lastAssistantText = normalized;
        const message = {
            type: "assistant",
            message: createAssistantTextMessage(normalized),
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
        };
        this.pushMessage(message);
    }
    emitSystemInitMessage(sessionId) {
        if (this.hasInitMessage) {
            return;
        }
        this.hasInitMessage = true;
        const message = {
            type: "system",
            subtype: "init",
            agents: undefined,
            apiKeySource: "user",
            claude_code_version: "opencode-cli",
            cwd: this.config.workingDirectory || cwd(),
            tools: this.config.allowedTools || [],
            mcp_servers: Object.keys(buildOpenCodeConfig(this.config).config.mcp ?? {}).map((name) => ({ name, status: "connected" })),
            model: resolveModelDisplay(this.config),
            permissionMode: "default",
            slash_commands: [],
            output_style: "default",
            skills: [],
            plugins: [],
            uuid: crypto.randomUUID(),
            session_id: sessionId,
        };
        this.pushMessage(message);
    }
    createSuccessResultMessage(result, stopReason = null) {
        return {
            type: "result",
            subtype: "success",
            duration_ms: Math.max(Date.now() - this.startTimestampMs, 0),
            duration_api_ms: 0,
            is_error: false,
            num_turns: 1,
            result,
            stop_reason: stopReason,
            total_cost_usd: this.totalCostUsd,
            usage: createResultUsage(this.lastUsage),
            modelUsage: {},
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
        };
    }
    createErrorResultMessage(errorMessage) {
        return {
            type: "result",
            subtype: "error_during_execution",
            duration_ms: Math.max(Date.now() - this.startTimestampMs, 0),
            duration_api_ms: 0,
            is_error: true,
            num_turns: 1,
            stop_reason: null,
            errors: [errorMessage],
            total_cost_usd: this.totalCostUsd,
            usage: createResultUsage(this.lastUsage),
            modelUsage: {},
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
        };
    }
    finalizeSession(error) {
        if (this.hasFinalized) {
            return;
        }
        this.hasFinalized = true;
        if (!this.sessionInfo) {
            return;
        }
        this.sessionInfo.isRunning = false;
        this.process = null;
        if (!this.hasInitMessage) {
            this.emitSystemInitMessage(this.sessionInfo.sessionId || this.config.resumeSessionId || "pending");
        }
        if (error) {
            const normalized = normalizeError(error);
            this.pendingResultMessage = this.createErrorResultMessage(normalized);
            this.emitError(error instanceof Error ? error : new Error(normalized));
        }
        if (!this.pendingResultMessage) {
            this.pendingResultMessage = this.createSuccessResultMessage(this.lastAssistantText || "OpenCode session completed successfully");
        }
        this.pushMessage(this.pendingResultMessage);
        this.pendingResultMessage = null;
        this.emit("complete", [...this.messages]);
    }
    pushMessage(message) {
        this.messages.push(message);
        this.emit("message", message);
    }
    emitError(error) {
        if (this.listenerCount("error") > 0) {
            this.emit("error", error);
        }
    }
}
//# sourceMappingURL=OpenCodeRunner.js.map