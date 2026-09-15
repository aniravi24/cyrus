import type { SDKMessage, SDKResultMessage } from "cyrus-core";
import type { OmpFrame, OmpSessionStats } from "./types.js";
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
/**
 * Maps omp RPC frames onto the Claude-SDK message shapes the Cyrus edge worker
 * consumes. Stateful only where the wire protocol splits one logical message
 * across frames (tool call start/end) or omits a session id until `get_state`.
 */
export declare class OmpEventMapper {
    private readonly options;
    private sessionId;
    private emittedInit;
    private emittedToolUseIds;
    private lastAssistantText;
    private startedAtMs;
    private stats;
    constructor(options: OmpEventMapperOptions);
    setSessionId(sessionId: string): void;
    getSessionId(): string | null;
    getLastAssistantText(): string;
    resetTimer(): void;
    /**
     * Fold omp's own accounting into the next result message. Without this the
     * result reports a zero cost, which reads as "this session was free" rather
     * than "cost unknown" everywhere Cyrus aggregates spend.
     */
    applySessionStats(stats: OmpSessionStats): void;
    /** Synthetic `system:init`, emitted once, as the edge worker expects it first. */
    systemInit(): SDKMessage[];
    /**
     * Project one frame onto zero or more SDK messages. Frames that carry no
     * timeline-visible content (deltas, turn boundaries, widgets) map to nothing.
     */
    map(frame: OmpFrame): SDKMessage[];
    private mapToolStart;
    private mapToolEnd;
    private mapMessageEnd;
    private mapSubagent;
    private mapAgentEnd;
    errorResult(errorMessage: string): SDKResultMessage;
    private result;
    private assistant;
    private toolResult;
    private usage;
    /**
     * Names the concrete models a session routed to, which differ from the
     * requested one after a fallback or an account rotation. omp reports a call
     * count per model but no per-model tokens or cost, so those fields stay zero
     * here and the session total on the result carries the real numbers.
     */
    private modelUsage;
}
//# sourceMappingURL=OmpEventMapper.d.ts.map