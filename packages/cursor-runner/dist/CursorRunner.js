import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { chmodSync, copyFileSync, createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync, } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";
import { CursorMessageFormatter } from "./formatter.js";
import { buildCyrusPermissionsConfig, } from "./permissions.js";
import { buildCursorSandboxJson, buildSandboxEnv } from "./sandbox.js";
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
    return "Cursor execution failed";
}
function normalizeCursorModel(model) {
    if (!model)
        return model;
    // Map legacy CLI aliases to SDK model IDs. The SDK rejects `auto` and bare
    // `gpt-5`; use `default` (server-side resolution) as a forward-compatible
    // fallback for both. Discover real ids via `Cursor.models.list()`.
    const lowered = model.toLowerCase();
    if (lowered === "gpt-5" || lowered === "auto")
        return "default";
    return model;
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
        model: "cursor-agent",
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
function createAssistantTextMessage(content, messageId = crypto.randomUUID()) {
    const contentBlocks = [
        { type: "text", text: content },
    ];
    return {
        id: messageId,
        type: "message",
        role: "assistant",
        content: contentBlocks,
        model: "cursor-agent",
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
function toFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function createResultUsage(totals) {
    return {
        input_tokens: totals?.inputTokens ?? 0,
        output_tokens: totals?.outputTokens ?? 0,
        // Cursor's `turn-ended` delta exposes `cacheWriteTokens` as a single
        // counter that maps onto Anthropic's `cache_creation_input_tokens`. The
        // SDK does not split ephemeral 1h vs 5m — we report 0 for both buckets
        // and put the full count in the parent field (which is what Cyrus
        // formatters and Linear's cost display read first).
        cache_creation_input_tokens: totals?.cacheWriteTokens ?? 0,
        cache_read_input_tokens: totals?.cacheReadTokens ?? 0,
        cache_creation: {
            ephemeral_1h_input_tokens: 0,
            ephemeral_5m_input_tokens: 0,
        },
    };
}
/**
 * Convert the Cyrus inline MCP config (potentially containing in-process
 * SDK servers) into the SDK's serializable McpServerConfig format. Skips
 * entries that aren't transportable.
 */
function mapCyrusMcpToSdk(mcpConfig) {
    const servers = {};
    if (!mcpConfig)
        return servers;
    for (const [name, raw] of Object.entries(mcpConfig)) {
        const cfg = raw;
        if (typeof cfg.listTools === "function" ||
            typeof cfg.callTool === "function") {
            console.warn(`[CursorRunner] Skipping MCP server '${name}' because in-process SDK server instances cannot be serialized for @cursor/sdk`);
            continue;
        }
        if (typeof cfg.url === "string" && cfg.url.length > 0) {
            const headers = cfg.headers &&
                typeof cfg.headers === "object" &&
                !Array.isArray(cfg.headers)
                ? cfg.headers
                : undefined;
            const type = (cfg.type === "sse" ? "sse" : "http");
            servers[name] = {
                type,
                url: cfg.url,
                ...(headers ? { headers } : {}),
            };
            continue;
        }
        if (typeof cfg.command === "string" && cfg.command.length > 0) {
            const args = Array.isArray(cfg.args) ? cfg.args : undefined;
            const env = cfg.env && typeof cfg.env === "object" && !Array.isArray(cfg.env)
                ? cfg.env
                : undefined;
            servers[name] = {
                type: "stdio",
                command: cfg.command,
                ...(args ? { args } : {}),
                ...(env ? { env } : {}),
                ...(typeof cfg.cwd === "string" ? { cwd: cfg.cwd } : {}),
            };
            continue;
        }
        console.warn(`[CursorRunner] Skipping MCP server '${name}' because it has no serializable command/url transport`);
    }
    return servers;
}
/**
 * Project an SDK `tool_call` event into the Claude-shaped tool_use /
 * tool_result pair that the Cyrus formatter and timeline expect.
 *
 * MCP tool calls surface as the generic `name: "mcp"` in the SDK stream;
 * this inspects `args` to extract the actual `<server>:<tool>` and
 * re-projects them as `mcp__<server>__<tool>` to match the Claude
 * runner's convention.
 */
function projectToolCall(event, workingDirectory) {
    const args = (event.args ?? {});
    const rawName = (event.name ?? "").toLowerCase();
    let toolName = event.name ?? "Tool";
    let toolInput = args;
    if (rawName === "shell") {
        toolName = "Bash";
        const command = typeof args.command === "string" ? args.command : "";
        toolInput = { command, description: command };
    }
    else if (rawName === "read") {
        toolName = "Read";
        toolInput = {
            file_path: typeof args.path === "string" ? args.path : args.file_path,
            offset: args.offset,
            limit: args.limit,
        };
    }
    else if (rawName === "grep") {
        toolName = "Grep";
        toolInput = {
            pattern: typeof args.pattern === "string" ? args.pattern : "",
            path: typeof args.path === "string" ? args.path : undefined,
        };
    }
    else if (rawName === "glob") {
        toolName = "Glob";
        toolInput = {
            pattern: typeof args.globPattern === "string" ? args.globPattern : args.pattern,
            path: typeof args.targetDirectory === "string"
                ? args.targetDirectory
                : undefined,
        };
    }
    else if (rawName === "edit" ||
        rawName === "write" ||
        rawName === "delete") {
        toolName =
            rawName === "delete" ? "Edit" : rawName === "write" ? "Write" : "Edit";
        toolInput = { file_path: typeof args.path === "string" ? args.path : "" };
    }
    else if (rawName === "mcp") {
        const provider = typeof args.providerIdentifier === "string"
            ? args.providerIdentifier
            : typeof args.server === "string"
                ? args.server
                : "mcp";
        const innerTool = typeof args.toolName === "string"
            ? args.toolName
            : typeof args.name === "string"
                ? args.name
                : "tool";
        toolName = `mcp__${provider}__${innerTool}`;
        toolInput =
            args.args && typeof args.args === "object"
                ? args.args
                : {};
    }
    else if (rawName === "update_todos" || rawName === "updatetodos") {
        toolName = "TodoWrite";
        toolInput = { todos: args.todos };
    }
    else if (rawName === "web_fetch" || rawName === "webfetch") {
        toolName = "WebFetch";
        toolInput = { url: typeof args.url === "string" ? args.url : "" };
    }
    let resultText = "Tool completed";
    const isError = event.status === "error";
    if (event.result !== undefined && event.result !== null) {
        if (typeof event.result === "string") {
            resultText = event.result;
        }
        else {
            resultText = safeStringify(event.result);
        }
    }
    else if (isError) {
        resultText = "Tool failed";
    }
    // Light path normalization: trim workingDirectory prefix on read targets.
    if (workingDirectory &&
        toolName === "Read" &&
        typeof toolInput.file_path === "string" &&
        toolInput.file_path.startsWith(workingDirectory)) {
        const rel = toolInput.file_path
            .slice(workingDirectory.length)
            .replace(/^\//, "");
        if (rel)
            toolInput = { ...toolInput, file_path: rel };
    }
    return {
        toolUseId: event.call_id,
        toolName,
        toolInput,
        result: resultText,
        isError,
    };
}
export class CursorRunner extends EventEmitter {
    supportsStreamingInput = false;
    config;
    sessionInfo = null;
    messages = [];
    formatter;
    agent = null;
    currentRun = null;
    pendingResultMessage = null;
    hasInitMessage = false;
    lastAssistantText = null;
    assistantTextBuffer = "";
    tokenTotals = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
    };
    wasStopped = false;
    startTimestampMs = 0;
    errorMessages = [];
    emittedToolUseIds = new Set();
    logStream = null;
    hooksRestoreState = null;
    sandboxRestoreState = null;
    sandboxEnvRestoreState = null;
    permissionsArtifactsInstalled = false;
    constructor(config) {
        super();
        this.config = config;
        this.formatter = new CursorMessageFormatter();
        if (config.onMessage)
            this.on("message", config.onMessage);
        if (config.onError)
            this.on("error", config.onError);
        if (config.onComplete)
            this.on("complete", config.onComplete);
    }
    async start(prompt) {
        if (this.isRunning()) {
            throw new Error("Cursor session already running");
        }
        const initialSessionId = this.config.resumeSessionId || crypto.randomUUID();
        this.sessionInfo = {
            sessionId: initialSessionId,
            startedAt: new Date(),
            isRunning: true,
        };
        this.messages = [];
        this.pendingResultMessage = null;
        this.hasInitMessage = false;
        this.lastAssistantText = null;
        this.assistantTextBuffer = "";
        this.tokenTotals = {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
        };
        this.wasStopped = false;
        this.startTimestampMs = Date.now();
        this.errorMessages = [];
        this.emittedToolUseIds.clear();
        this.setupLogging(initialSessionId);
        const workspace = resolve(this.config.workingDirectory || cwd());
        try {
            this.installPermissionsArtifacts(workspace);
            // Test/CI fallback for environments where the SDK can't run.
            if (process.env.CYRUS_CURSOR_MOCK === "1") {
                this.emitInitMessage();
                this.pushAssistantText("Cursor mock session completed");
                this.pendingResultMessage = this.createSuccessResultMessage("Cursor mock session completed");
                this.finalizeSession();
                return this.sessionInfo;
            }
            const apiKey = this.config.cursorApiKey ?? process.env.CURSOR_API_KEY;
            const normalizedModel = normalizeCursorModel(this.config.model);
            const mcpServers = mapCyrusMcpToSdk(this.config.mcpConfig);
            const sandboxEnabled = Boolean(this.config.sandboxSettings?.enabled);
            const baseAgentOptions = {
                apiKey,
                ...(normalizedModel ? { model: { id: normalizedModel } } : {}),
                local: {
                    // `cwd` is passed as a string[] per Cyrus convention; the SDK
                    // types accept `string | string[]`.
                    cwd: [workspace],
                    settingSources: ["project"],
                    // SDK ≥1.0.11 auto-discovers the bundled `cursorsandbox`
                    // helper from the platform-specific optionalDependency
                    // (e.g. `@cursor/sdk-darwin-arm64`). The corresponding
                    // `.cursor/sandbox.json` policy is written by
                    // `installPermissionsArtifacts` so it is in place before
                    // the SDK reads it during agent startup.
                    sandboxOptions: { enabled: sandboxEnabled },
                },
                ...(Object.keys(mcpServers).length > 0 ? { mcpServers } : {}),
            };
            const { Agent } = await import("@cursor/sdk");
            let agent;
            if (this.config.resumeSessionId) {
                console.log(`[CursorRunner] Resuming agent ${this.config.resumeSessionId}`);
                agent = await Agent.resume(this.config.resumeSessionId, baseAgentOptions);
            }
            else {
                agent = await Agent.create(baseAgentOptions);
            }
            this.agent = agent;
            if (this.sessionInfo) {
                this.sessionInfo.sessionId = agent.agentId;
            }
            this.emitInitMessage();
            console.log(`[CursorRunner] Sending prompt to agent ${agent.agentId} (resume=${Boolean(this.config.resumeSessionId)})`);
            let caughtError;
            try {
                const run = await agent.send(prompt, {
                    onDelta: ({ update }) => {
                        // `turn-ended` is the only delta carrying token totals.
                        // Each fire is a per-turn snapshot — accumulate across
                        // turns so the final result reports the run total.
                        if (update &&
                            typeof update === "object" &&
                            update.type === "turn-ended") {
                            const usage = update
                                .usage;
                            if (usage) {
                                this.tokenTotals.inputTokens += toFiniteNumber(usage.inputTokens);
                                this.tokenTotals.outputTokens += toFiniteNumber(usage.outputTokens);
                                this.tokenTotals.cacheReadTokens += toFiniteNumber(usage.cacheReadTokens);
                                this.tokenTotals.cacheWriteTokens += toFiniteNumber(usage.cacheWriteTokens);
                            }
                        }
                    },
                });
                this.currentRun = run;
                for await (const event of run.stream()) {
                    if (this.wasStopped)
                        break;
                    this.handleSdkEvent(event);
                }
            }
            catch (error) {
                caughtError = error;
            }
            this.finalizeSession(caughtError);
        }
        catch (error) {
            this.finalizeSession(error);
        }
        return this.sessionInfo;
    }
    async startStreaming(_initialPrompt) {
        throw new Error("CursorRunner does not support streaming input");
    }
    addStreamMessage(_content) {
        throw new Error("CursorRunner does not support streaming input messages");
    }
    completeStream() {
        // No-op: CursorRunner does not support streaming input.
    }
    stop() {
        this.wasStopped = true;
        const run = this.currentRun;
        if (run && typeof run.cancel === "function") {
            void run.cancel().catch(() => { });
        }
        const agent = this.agent;
        if (agent && typeof agent.close === "function") {
            try {
                agent.close();
            }
            catch { }
        }
        if (this.sessionInfo) {
            this.sessionInfo.isRunning = false;
        }
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
    // ---------- SDK event handling ----------
    handleSdkEvent(event) {
        switch (event.type) {
            case "system":
                if (event.subtype === "init" && this.sessionInfo) {
                    this.sessionInfo.sessionId = event.agent_id;
                }
                this.emitInitMessage();
                return;
            case "assistant":
                this.handleAssistantEvent(event);
                return;
            case "user":
                this.flushAssistantTextBuffer();
                this.handleUserEvent(event);
                return;
            case "tool_call":
                this.flushAssistantTextBuffer();
                this.handleToolCallEvent(event);
                return;
            case "thinking":
                this.flushAssistantTextBuffer();
                this.handleThinkingEvent(event);
                return;
            case "status":
                this.flushAssistantTextBuffer();
                this.handleStatusEvent(event);
                return;
            default:
                return;
        }
    }
    handleAssistantEvent(event) {
        this.emitInitMessage();
        const content = event.message?.content ?? [];
        for (const block of content) {
            if (!block || typeof block !== "object")
                continue;
            if (block.type === "text" && typeof block.text === "string") {
                if (block.text.length === 0)
                    continue;
                // Coalesce consecutive text deltas into one assistant message —
                // the SDK streams partial text across multiple `assistant` events
                // per turn. We flush before any non-text block (tool_use below or
                // non-assistant event in handleSdkEvent) and at end of stream.
                this.assistantTextBuffer += block.text;
            }
            else if (block.type === "tool_use") {
                this.flushAssistantTextBuffer();
                const rawName = String(block.name || "Tool");
                const lowered = rawName.toLowerCase();
                let toolName = rawName;
                let toolInput = (block.input ?? {});
                // MCP tool_use blocks surface as name="mcp" — extract real id.
                if (lowered === "mcp") {
                    const args = toolInput;
                    const provider = typeof args.providerIdentifier === "string"
                        ? args.providerIdentifier
                        : typeof args.server === "string"
                            ? args.server
                            : "mcp";
                    const innerTool = typeof args.toolName === "string"
                        ? args.toolName
                        : typeof args.name === "string"
                            ? args.name
                            : "tool";
                    toolName = `mcp__${provider}__${innerTool}`;
                    toolInput =
                        args.args && typeof args.args === "object"
                            ? args.args
                            : {};
                }
                this.emitToolUse({
                    toolUseId: block.id,
                    toolName,
                    toolInput,
                    result: "",
                    isError: false,
                });
            }
        }
    }
    handleUserEvent(event) {
        this.emitInitMessage();
        const content = event.message?.content ?? [];
        const text = content
            .filter((b) => Boolean(b) &&
            typeof b === "object" &&
            b.type === "text")
            .map((b) => b.text)
            .join("")
            .trim();
        if (!text)
            return;
        const message = {
            type: "user",
            message: {
                role: "user",
                content: [{ type: "text", text }],
            },
            parent_tool_use_id: null,
            session_id: this.sessionInfo?.sessionId || "pending",
        };
        this.pushMessage(message);
    }
    handleToolCallEvent(event) {
        this.emitInitMessage();
        const projection = projectToolCall(event, this.config.workingDirectory);
        if (event.status === "running") {
            this.emitToolUse(projection);
            return;
        }
        this.emitToolUse(projection);
        this.emitToolResult(projection);
    }
    handleThinkingEvent(_event) {
        // cyrus-core's SDKAssistantMessage content blocks don't yet include
        // "thinking"; intentionally drop these to avoid invalid shapes.
    }
    handleStatusEvent(event) {
        if (event.status === "ERROR") {
            const message = event.message || "Cursor session errored";
            this.errorMessages.push(message);
            this.pendingResultMessage = this.createErrorResultMessage(message);
        }
        else if (event.status === "CANCELLED") {
            this.pendingResultMessage = this.createErrorResultMessage("Cursor session cancelled");
        }
        else if (event.status === "EXPIRED") {
            this.pendingResultMessage = this.createErrorResultMessage("Cursor session expired");
        }
    }
    // ---------- Permission artifacts ----------
    installPermissionsArtifacts(workspace) {
        const cursorDir = join(workspace, ".cursor");
        mkdirSync(cursorDir, { recursive: true });
        // 1. Permissions config (auto-deny is merged in by the helper). Pass
        // the SDK-shaped MCP server map so the helper can derive a logical
        // server name (e.g. "linear") from the command/url that the
        // `beforeMCPExecution` payload exposes — patterns like
        // `Mcp(linear:save_comment)` only match when we provide that lookup.
        const sdkMcpServers = mapCyrusMcpToSdk(this.config.mcpConfig);
        const cfg = buildCyrusPermissionsConfig({
            workspace,
            allowedTools: this.config.allowedTools,
            disallowedTools: this.config.disallowedTools,
            mcpServers: sdkMcpServers,
        });
        writeFileSync(join(cursorDir, "cyrus-permissions.json"), `${JSON.stringify(cfg, null, "\t")}\n`, "utf8");
        // 2. Permission helper script (copied from package's bundled .mjs)
        const helperDst = join(cursorDir, "cyrus-permission-check.mjs");
        const helperSrc = this.locatePermissionCheckSource();
        copyFileSync(helperSrc, helperDst);
        try {
            chmodSync(helperDst, 0o755);
        }
        catch { }
        // 3. Hooks config (back up any existing one)
        const hooksPath = join(cursorDir, "hooks.json");
        const existed = existsSync(hooksPath);
        const backupPath = existed
            ? `${hooksPath}.cyrus-backup-${Date.now()}-${process.pid}`
            : null;
        if (existed && backupPath) {
            renameSync(hooksPath, backupPath);
        }
        const hooksConfig = {
            version: 1,
            hooks: {
                preToolUse: [
                    { command: "./.cursor/cyrus-permission-check.mjs", failClosed: true },
                ],
                beforeShellExecution: [
                    { command: "./.cursor/cyrus-permission-check.mjs", failClosed: true },
                ],
                beforeReadFile: [
                    { command: "./.cursor/cyrus-permission-check.mjs", failClosed: true },
                ],
                beforeMCPExecution: [
                    { command: "./.cursor/cyrus-permission-check.mjs", failClosed: true },
                ],
            },
        };
        writeFileSync(hooksPath, `${JSON.stringify(hooksConfig, null, "\t")}\n`, "utf8");
        this.hooksRestoreState = { hooksPath, backupPath };
        this.permissionsArtifactsInstalled = true;
        console.log(`[CursorRunner] Installed Cyrus permission hooks at ${hooksPath} (allow=${cfg.allow.length}, deny=${cfg.deny.length}, backup=${backupPath ? "yes" : "no"})`);
        // 4. Sandbox policy file (only when sandbox is enabled). Cursor's
        // `local.sandboxOptions.enabled: true` engages Apple Seatbelt /
        // Linux Landlock; the policy below extends the default
        // `workspace_readwrite` profile with allow/deny lists translated
        // from the Cyrus / Claude SandboxSettings shape.
        this.installSandboxArtifacts(workspace);
    }
    installSandboxArtifacts(workspace) {
        const sandboxJson = buildCursorSandboxJson({
            workspace,
            sandboxSettings: this.config.sandboxSettings,
            egressCaCertPath: this.config.egressCaCertPath,
            additionalReadwritePaths: this.config.allowedDirectories ?? [],
        });
        if (!sandboxJson)
            return;
        const cursorDir = join(workspace, ".cursor");
        const sandboxPath = join(cursorDir, "sandbox.json");
        const existed = existsSync(sandboxPath);
        const backupPath = existed
            ? `${sandboxPath}.cyrus-backup-${Date.now()}-${process.pid}`
            : null;
        if (existed && backupPath) {
            renameSync(sandboxPath, backupPath);
        }
        writeFileSync(sandboxPath, `${JSON.stringify(sandboxJson, null, "\t")}\n`, "utf8");
        this.sandboxRestoreState = { sandboxPath, backupPath };
        // Apply env vars on `process.env` so any child shell process spawned
        // by the SDK inherits them. We snapshot the previous values and
        // restore them in `uninstallSandboxArtifacts`.
        const env = buildSandboxEnv({
            sandboxSettings: this.config.sandboxSettings,
            egressCaCertPath: this.config.egressCaCertPath,
        });
        const restore = new Map();
        for (const k of Object.keys(env)) {
            restore.set(k, process.env[k]);
            process.env[k] = env[k];
        }
        this.sandboxEnvRestoreState = restore;
        console.log(`[CursorRunner] Installed Cursor sandbox policy at ${sandboxPath} (allowReadwrite=${sandboxJson.additionalReadwritePaths.length}, allowReadonly=${sandboxJson.additionalReadonlyPaths.length}, networkAllow=${sandboxJson.networkPolicy.allow.length}, backup=${backupPath ? "yes" : "no"})`);
    }
    uninstallSandboxArtifacts() {
        const restore = this.sandboxRestoreState;
        if (restore) {
            try {
                if (existsSync(restore.sandboxPath))
                    unlinkSync(restore.sandboxPath);
                if (restore.backupPath && existsSync(restore.backupPath)) {
                    renameSync(restore.backupPath, restore.sandboxPath);
                }
            }
            catch (error) {
                const detail = error instanceof Error ? error.message : String(error);
                console.warn(`[CursorRunner] Failed to restore sandbox.json at ${restore.sandboxPath}: ${detail}`);
            }
            this.sandboxRestoreState = null;
        }
        const envRestore = this.sandboxEnvRestoreState;
        if (envRestore) {
            for (const [k, v] of envRestore.entries()) {
                if (v === undefined) {
                    delete process.env[k];
                }
                else {
                    process.env[k] = v;
                }
            }
            this.sandboxEnvRestoreState = null;
        }
    }
    locatePermissionCheckSource() {
        const here = dirname(fileURLToPath(import.meta.url));
        // When built, the .mjs sits next to the compiled JS in dist/.
        const built = join(here, "permission-check.mjs");
        if (existsSync(built))
            return built;
        // During tests against src/, fall back to the source file.
        const fromSrc = join(here, "permission-check.mjs");
        if (existsSync(fromSrc))
            return fromSrc;
        // Last-ditch: package root.
        const pkgRoot = join(here, "..", "src", "permission-check.mjs");
        if (existsSync(pkgRoot))
            return pkgRoot;
        throw new Error("[CursorRunner] could not locate cyrus permission-check.mjs helper");
    }
    uninstallPermissionsArtifacts() {
        this.uninstallSandboxArtifacts();
        if (!this.permissionsArtifactsInstalled)
            return;
        const workspace = resolve(this.config.workingDirectory || cwd());
        const cursorDir = join(workspace, ".cursor");
        const cfgPath = join(cursorDir, "cyrus-permissions.json");
        const helperPath = join(cursorDir, "cyrus-permission-check.mjs");
        try {
            if (existsSync(cfgPath))
                unlinkSync(cfgPath);
        }
        catch { }
        try {
            if (existsSync(helperPath))
                unlinkSync(helperPath);
        }
        catch { }
        const hooks = this.hooksRestoreState;
        if (hooks) {
            try {
                if (existsSync(hooks.hooksPath))
                    unlinkSync(hooks.hooksPath);
                if (hooks.backupPath && existsSync(hooks.backupPath)) {
                    renameSync(hooks.backupPath, hooks.hooksPath);
                }
            }
            catch (error) {
                const detail = error instanceof Error ? error.message : String(error);
                console.warn(`[CursorRunner] Failed to restore hooks at ${hooks.hooksPath}: ${detail}`);
            }
        }
        this.hooksRestoreState = null;
        this.permissionsArtifactsInstalled = false;
    }
    // ---------- Internal helpers ----------
    emitToolUse(projection) {
        if (this.emittedToolUseIds.has(projection.toolUseId))
            return;
        this.emittedToolUseIds.add(projection.toolUseId);
        const message = {
            type: "assistant",
            message: createAssistantToolUseMessage(projection.toolUseId, projection.toolName, projection.toolInput),
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
        };
        this.pushMessage(message);
    }
    emitToolResult(projection) {
        const message = {
            type: "user",
            message: createUserToolResultMessage(projection.toolUseId, projection.result || "Tool completed", projection.isError),
            parent_tool_use_id: projection.toolUseId,
            session_id: this.sessionInfo?.sessionId || "pending",
        };
        this.pushMessage(message);
    }
    pushAssistantText(text) {
        const message = {
            type: "assistant",
            message: createAssistantTextMessage(text),
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
        };
        this.pushMessage(message);
    }
    flushAssistantTextBuffer() {
        const text = this.assistantTextBuffer;
        this.assistantTextBuffer = "";
        if (text.trim().length === 0)
            return;
        this.lastAssistantText = text;
        this.pushAssistantText(text);
    }
    emitInitMessage() {
        if (this.hasInitMessage)
            return;
        this.hasInitMessage = true;
        const sessionId = this.sessionInfo?.sessionId || crypto.randomUUID();
        const initMessage = {
            type: "system",
            subtype: "init",
            cwd: this.config.workingDirectory || cwd(),
            session_id: sessionId,
            tools: this.config.allowedTools || [],
            mcp_servers: [],
            model: this.config.model || "gpt-5",
            permissionMode: "default",
            apiKeySource: this.config.cursorApiKey ? "user" : "project",
            claude_code_version: "cursor-agent",
            slash_commands: [],
            output_style: "default",
            skills: [],
            plugins: [],
            uuid: crypto.randomUUID(),
            agents: undefined,
        };
        this.pushMessage(initMessage);
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
            usage: createResultUsage(this.tokenTotals),
            modelUsage: {},
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
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
            errors: [errorMessage],
            stop_reason: null,
            total_cost_usd: 0,
            usage: createResultUsage(this.tokenTotals),
            modelUsage: {},
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.sessionInfo?.sessionId || "pending",
        };
    }
    pushMessage(message) {
        this.messages.push(message);
        this.emit("message", message);
    }
    setupLogging(sessionId) {
        try {
            const logsDir = join(this.config.cyrusHome, "logs");
            mkdirSync(logsDir, { recursive: true });
            const stream = createWriteStream(join(logsDir, `cursor-${sessionId}.jsonl`), { flags: "a" });
            stream.on("error", () => {
                // Swallow — logging is best-effort and must not crash the runner.
            });
            this.logStream = stream;
        }
        catch {
            this.logStream = null;
        }
    }
    finalizeSession(error) {
        if (!this.sessionInfo)
            return;
        this.emitInitMessage();
        this.flushAssistantTextBuffer();
        this.sessionInfo.isRunning = false;
        this.uninstallPermissionsArtifacts();
        let resultMessage;
        if (this.pendingResultMessage) {
            resultMessage = this.pendingResultMessage;
        }
        else if (error || this.errorMessages.length > 0) {
            const message = normalizeError(error) ||
                this.errorMessages.at(-1) ||
                "Cursor execution failed";
            resultMessage = this.createErrorResultMessage(message);
        }
        else {
            resultMessage = this.createSuccessResultMessage(this.lastAssistantText || "Cursor session completed successfully");
        }
        this.pushMessage(resultMessage);
        this.emit("complete", [...this.messages]);
        if (error || this.errorMessages.length > 0) {
            const err = error instanceof Error
                ? error
                : new Error(this.errorMessages.at(-1) || "Cursor execution failed");
            this.emit("error", err);
        }
        this.cleanupRuntimeState();
    }
    cleanupRuntimeState() {
        if (this.logStream) {
            try {
                this.logStream.end();
            }
            catch { }
            this.logStream = null;
        }
        this.currentRun = null;
        this.agent = null;
        this.pendingResultMessage = null;
    }
}
//# sourceMappingURL=CursorRunner.js.map