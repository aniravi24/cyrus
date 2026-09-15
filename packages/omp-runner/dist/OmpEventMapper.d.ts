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
 * Maps omp RPC frames onto the Claude-SDK shapes the edge worker consumes.
 * Stateful only where one logical message spans frames (tool call start/end).
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
    /** Without this a result reports zero cost, which reads as free rather than unknown. */
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
    /** Assistant text for an aborted run; consumers read the reason from here. */
    abortNotice(text: string): SDKMessage;
    errorResult(errorMessage: string): SDKResultMessage;
    private result;
    private assistant;
    private toolResult;
    private usage;
    /** Names the models actually routed to; omp reports no per-model tokens or cost, so those stay zero. */
    private modelUsage;
}
//# sourceMappingURL=OmpEventMapper.d.ts.map