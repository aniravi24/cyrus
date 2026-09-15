import crypto from "node:crypto";
const PENDING_SESSION = "pending";
/** Joined text of every block of `kind`; omp splits one message across blocks. */
function blockText(blocks, kind) {
    if (!blocks)
        return "";
    return blocks
        .filter((block) => block.type === kind && typeof block[kind] === "string")
        .map((block) => block[kind])
        .join("\n")
        .trim();
}
/**
 * Maps omp RPC frames onto the Claude-SDK message shapes the Cyrus edge worker
 * consumes. Stateful only where the wire protocol splits one logical message
 * across frames (tool call start/end) or omits a session id until `get_state`.
 */
export class OmpEventMapper {
    options;
    sessionId = PENDING_SESSION;
    emittedInit = false;
    emittedToolUseIds = new Set();
    lastAssistantText = "";
    startedAtMs = Date.now();
    stats = null;
    constructor(options) {
        this.options = options;
    }
    setSessionId(sessionId) {
        this.sessionId = sessionId || PENDING_SESSION;
    }
    getSessionId() {
        return this.sessionId === PENDING_SESSION ? null : this.sessionId;
    }
    getLastAssistantText() {
        return this.lastAssistantText;
    }
    resetTimer() {
        this.startedAtMs = Date.now();
    }
    /**
     * Fold omp's own accounting into the next result message. Without this the
     * result reports a zero cost, which reads as "this session was free" rather
     * than "cost unknown" everywhere Cyrus aggregates spend.
     */
    applySessionStats(stats) {
        this.stats = stats;
    }
    /** Synthetic `system:init`, emitted once, as the edge worker expects it first. */
    systemInit() {
        if (this.emittedInit)
            return [];
        this.emittedInit = true;
        const message = {
            type: "system",
            subtype: "init",
            agents: undefined,
            apiKeySource: "user",
            claude_code_version: "omp-rpc",
            cwd: this.options.workingDirectory,
            tools: this.options.tools ?? [],
            mcp_servers: (this.options.mcpServers ?? []).map((name) => ({
                name,
                status: "connected",
            })),
            model: this.options.model,
            permissionMode: "default",
            slash_commands: [],
            output_style: "default",
            skills: [],
            plugins: [],
            uuid: crypto.randomUUID(),
            session_id: this.sessionId,
        };
        return [message];
    }
    /**
     * Project one frame onto zero or more SDK messages. Frames that carry no
     * timeline-visible content (deltas, turn boundaries, widgets) map to nothing.
     */
    map(frame) {
        switch (frame.type) {
            case "tool_execution_start":
                return this.mapToolStart(frame);
            case "tool_execution_end":
                return this.mapToolEnd(frame);
            case "message_end":
                return this.mapMessageEnd(frame);
            case "subagent_lifecycle":
            case "subagent_progress":
                return this.mapSubagent(frame);
            case "agent_end":
                return this.mapAgentEnd(frame);
            default:
                return [];
        }
    }
    mapToolStart(frame) {
        if (this.emittedToolUseIds.has(frame.toolCallId))
            return [];
        this.emittedToolUseIds.add(frame.toolCallId);
        return [
            this.assistant([
                {
                    type: "tool_use",
                    id: frame.toolCallId,
                    name: frame.toolName,
                    input: frame.args &&
                        typeof frame.args === "object" &&
                        !Array.isArray(frame.args)
                        ? frame.args
                        : {},
                },
            ]),
        ];
    }
    mapToolEnd(frame) {
        const messages = [];
        // A tool can complete without a start frame when the runner attaches
        // mid-turn (resume); synthesize the tool_use so the pair stays balanced.
        if (!this.emittedToolUseIds.has(frame.toolCallId)) {
            messages.push(this.assistant([
                {
                    type: "tool_use",
                    id: frame.toolCallId,
                    name: frame.toolName,
                    input: {},
                },
            ]));
        }
        this.emittedToolUseIds.delete(frame.toolCallId);
        const result = blockText(frame.result?.content, "text") || "(no output)";
        messages.push(this.toolResult(frame.toolCallId, result, frame.isError === true));
        return messages;
    }
    mapMessageEnd(frame) {
        if (frame.message?.role !== "assistant")
            return [];
        const messages = [];
        if (this.options.includeThinking) {
            const thinking = blockText(frame.message.content, "thinking");
            if (thinking) {
                messages.push(this.assistant([{ type: "text", text: thinking }]));
            }
        }
        const text = blockText(frame.message.content, "text");
        if (text) {
            this.lastAssistantText = text;
            messages.push(this.assistant([{ type: "text", text }]));
        }
        return messages;
    }
    mapSubagent(frame) {
        const label = frame.label ?? frame.agent ?? frame.subagentId ?? "subagent";
        const detail = frame.message ?? frame.status ?? frame.phase;
        if (!detail)
            return [];
        return [this.assistant([{ type: "text", text: `[${label}] ${detail}` }])];
    }
    mapAgentEnd(frame) {
        // `isTerminal: false` means maintenance or async delivery will resume the
        // session, so it is not a run boundary and must not produce a result.
        if (frame.isTerminal === false)
            return [];
        const trailing = frame.messages?.filter((message) => message.role === "assistant");
        const finalText = trailing?.length
            ? blockText(trailing[trailing.length - 1]?.content, "text")
            : "";
        if (finalText)
            this.lastAssistantText = finalText;
        return [this.result(this.lastAssistantText || "OMP session completed")];
    }
    errorResult(errorMessage) {
        return {
            type: "result",
            subtype: "error_during_execution",
            duration_ms: Math.max(Date.now() - this.startedAtMs, 0),
            duration_api_ms: 0,
            is_error: true,
            num_turns: 1,
            stop_reason: null,
            errors: [errorMessage],
            total_cost_usd: this.stats?.cost ?? 0,
            usage: this.usage(),
            modelUsage: this.modelUsage(),
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.sessionId,
        };
    }
    result(text) {
        return {
            type: "result",
            subtype: "success",
            duration_ms: Math.max(Date.now() - this.startedAtMs, 0),
            duration_api_ms: 0,
            is_error: false,
            num_turns: this.stats?.assistantMessages ?? 1,
            result: text,
            stop_reason: null,
            total_cost_usd: this.stats?.cost ?? 0,
            usage: this.usage(),
            modelUsage: this.modelUsage(),
            permission_denials: [],
            uuid: crypto.randomUUID(),
            session_id: this.sessionId,
        };
    }
    assistant(content) {
        return {
            type: "assistant",
            message: {
                id: crypto.randomUUID(),
                type: "message",
                role: "assistant",
                content: content,
                model: this.options.model,
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
            },
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.sessionId,
        };
    }
    toolResult(toolUseId, result, isError) {
        return {
            type: "user",
            message: {
                role: "user",
                content: [
                    {
                        type: "tool_result",
                        tool_use_id: toolUseId,
                        content: result,
                        is_error: isError,
                    },
                ],
            },
            parent_tool_use_id: null,
            uuid: crypto.randomUUID(),
            session_id: this.sessionId,
        };
    }
    usage() {
        const tokens = this.stats?.tokens;
        return {
            input_tokens: tokens?.input ?? 0,
            output_tokens: tokens?.output ?? 0,
            cache_creation_input_tokens: tokens?.cacheWrite ?? 0,
            cache_read_input_tokens: tokens?.cacheRead ?? 0,
            cache_creation: {
                ephemeral_1h_input_tokens: 0,
                ephemeral_5m_input_tokens: 0,
            },
        };
    }
    /**
     * Names the concrete models a session routed to, which differ from the
     * requested one after a fallback or an account rotation. omp reports a call
     * count per model but no per-model tokens or cost, so those fields stay zero
     * here and the session total on the result carries the real numbers.
     */
    modelUsage() {
        const routed = this.stats?.routedModels;
        if (!routed)
            return {};
        const entries = Object.keys(routed).map((model) => [
            model,
            {
                inputTokens: 0,
                outputTokens: 0,
                cacheReadInputTokens: 0,
                cacheCreationInputTokens: 0,
                webSearchRequests: 0,
                costUSD: 0,
                contextWindow: 0,
            },
        ]);
        return Object.fromEntries(entries);
    }
}
//# sourceMappingURL=OmpEventMapper.js.map