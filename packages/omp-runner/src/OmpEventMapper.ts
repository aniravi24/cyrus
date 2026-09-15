import crypto from "node:crypto";
import type {
	SDKAssistantMessage,
	SDKMessage,
	SDKResultMessage,
	SDKUserMessage,
} from "cyrus-core";
import type {
	OmpAgentEndFrame,
	OmpContentBlock,
	OmpFrame,
	OmpMessageEndFrame,
	OmpSubagentFrame,
	OmpToolExecutionEndFrame,
	OmpToolExecutionStartFrame,
} from "./types.js";

type SDKSystemInitMessage = Extract<
	SDKMessage,
	{ type: "system"; subtype: "init" }
>;

const PENDING_SESSION = "pending";

export interface OmpEventMapperOptions {
	model: string;
	workingDirectory: string;
	/** Emit assistant thinking blocks as activity text. */
	includeThinking?: boolean;
	/** Tool names advertised on the synthetic system init message. */
	tools?: string[];
	/** MCP server names advertised on the synthetic system init message. */
	mcpServers?: string[];
}

/** Joined text of every block of `kind`; omp splits one message across blocks. */
function blockText(
	blocks: OmpContentBlock[] | undefined,
	kind: "text" | "thinking",
): string {
	if (!blocks) return "";
	return blocks
		.filter((block) => block.type === kind && typeof block[kind] === "string")
		.map((block) => block[kind] as string)
		.join("\n")
		.trim();
}

/**
 * Maps omp RPC frames onto the Claude-SDK message shapes the Cyrus edge worker
 * consumes. Stateful only where the wire protocol splits one logical message
 * across frames (tool call start/end) or omits a session id until `get_state`.
 */
export class OmpEventMapper {
	private sessionId: string = PENDING_SESSION;
	private emittedInit = false;
	private emittedToolUseIds = new Set<string>();
	private lastAssistantText = "";
	private startedAtMs = Date.now();

	constructor(private readonly options: OmpEventMapperOptions) {}

	setSessionId(sessionId: string): void {
		this.sessionId = sessionId || PENDING_SESSION;
	}

	getSessionId(): string | null {
		return this.sessionId === PENDING_SESSION ? null : this.sessionId;
	}

	getLastAssistantText(): string {
		return this.lastAssistantText;
	}

	resetTimer(): void {
		this.startedAtMs = Date.now();
	}

	/** Synthetic `system:init`, emitted once, as the edge worker expects it first. */
	systemInit(): SDKMessage[] {
		if (this.emittedInit) return [];
		this.emittedInit = true;
		const message: SDKSystemInitMessage = {
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
	map(frame: OmpFrame): SDKMessage[] {
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

	private mapToolStart(frame: OmpToolExecutionStartFrame): SDKMessage[] {
		if (this.emittedToolUseIds.has(frame.toolCallId)) return [];
		this.emittedToolUseIds.add(frame.toolCallId);
		return [
			this.assistant([
				{
					type: "tool_use",
					id: frame.toolCallId,
					name: frame.toolName,
					input:
						frame.args &&
						typeof frame.args === "object" &&
						!Array.isArray(frame.args)
							? (frame.args as Record<string, unknown>)
							: {},
				},
			]),
		];
	}

	private mapToolEnd(frame: OmpToolExecutionEndFrame): SDKMessage[] {
		const messages: SDKMessage[] = [];
		// A tool can complete without a start frame when the runner attaches
		// mid-turn (resume); synthesize the tool_use so the pair stays balanced.
		if (!this.emittedToolUseIds.has(frame.toolCallId)) {
			messages.push(
				this.assistant([
					{
						type: "tool_use",
						id: frame.toolCallId,
						name: frame.toolName,
						input: {},
					},
				]),
			);
		}
		this.emittedToolUseIds.delete(frame.toolCallId);
		const result = blockText(frame.result?.content, "text") || "(no output)";
		messages.push(
			this.toolResult(frame.toolCallId, result, frame.isError === true),
		);
		return messages;
	}

	private mapMessageEnd(frame: OmpMessageEndFrame): SDKMessage[] {
		if (frame.message?.role !== "assistant") return [];
		const messages: SDKMessage[] = [];
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

	private mapSubagent(frame: OmpSubagentFrame): SDKMessage[] {
		const label = frame.label ?? frame.agent ?? frame.subagentId ?? "subagent";
		const detail = frame.message ?? frame.status ?? frame.phase;
		if (!detail) return [];
		return [this.assistant([{ type: "text", text: `[${label}] ${detail}` }])];
	}

	private mapAgentEnd(frame: OmpAgentEndFrame): SDKMessage[] {
		// `isTerminal: false` means maintenance or async delivery will resume the
		// session, so it is not a run boundary and must not produce a result.
		if (frame.isTerminal === false) return [];
		const trailing = frame.messages?.filter(
			(message) => message.role === "assistant",
		);
		const finalText = trailing?.length
			? blockText(trailing[trailing.length - 1]?.content, "text")
			: "";
		if (finalText) this.lastAssistantText = finalText;
		return [this.result(this.lastAssistantText || "OMP session completed")];
	}

	errorResult(errorMessage: string): SDKResultMessage {
		return {
			type: "result",
			subtype: "error_during_execution",
			duration_ms: Math.max(Date.now() - this.startedAtMs, 0),
			duration_api_ms: 0,
			is_error: true,
			num_turns: 1,
			stop_reason: null,
			errors: [errorMessage],
			total_cost_usd: 0,
			usage: this.emptyUsage(),
			modelUsage: {},
			permission_denials: [],
			uuid: crypto.randomUUID(),
			session_id: this.sessionId,
		} as SDKResultMessage;
	}

	private result(text: string): SDKResultMessage {
		return {
			type: "result",
			subtype: "success",
			duration_ms: Math.max(Date.now() - this.startedAtMs, 0),
			duration_api_ms: 0,
			is_error: false,
			num_turns: 1,
			result: text,
			stop_reason: null,
			total_cost_usd: 0,
			usage: this.emptyUsage(),
			modelUsage: {},
			permission_denials: [],
			uuid: crypto.randomUUID(),
			session_id: this.sessionId,
		} as SDKResultMessage;
	}

	private assistant(content: unknown[]): SDKAssistantMessage {
		return {
			type: "assistant",
			message: {
				id: crypto.randomUUID(),
				type: "message",
				role: "assistant",
				content: content as SDKAssistantMessage["message"]["content"],
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
				} as SDKAssistantMessage["message"]["usage"],
				container: null,
				context_management: null,
				diagnostics: null,
			},
			parent_tool_use_id: null,
			uuid: crypto.randomUUID(),
			session_id: this.sessionId,
		};
	}

	private toolResult(
		toolUseId: string,
		result: string,
		isError: boolean,
	): SDKUserMessage {
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
				] as unknown as SDKUserMessage["message"]["content"],
			},
			parent_tool_use_id: null,
			uuid: crypto.randomUUID(),
			session_id: this.sessionId,
		};
	}

	private emptyUsage(): SDKResultMessage["usage"] {
		return {
			input_tokens: 0,
			output_tokens: 0,
			cache_creation_input_tokens: 0,
			cache_read_input_tokens: 0,
			cache_creation: {
				ephemeral_1h_input_tokens: 0,
				ephemeral_5m_input_tokens: 0,
			},
		} as SDKResultMessage["usage"];
	}
}
