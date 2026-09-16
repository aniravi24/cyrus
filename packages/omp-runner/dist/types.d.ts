import type { AgentRunnerConfig, AgentSessionInfo, SDKMessage } from "cyrus-core";
export interface OmpRunnerConfig extends AgentRunnerConfig {
    /** Path to the omp binary (defaults to `omp` in PATH). */
    ompPath?: string;
    /**
     * Approval mode handed to omp. Unattended Cyrus sessions need `yolo`,
     * because a prompt tier has no interactive surface to resolve it.
     */
    approvalMode?: "always-ask" | "write" | "yolo";
    /**
     * Subagent frame forwarding. `progress` surfaces task fan-out in the issue
     * timeline; `off` makes parallel subagents invisible to Cyrus.
     */
    subagentSubscription?: "off" | "progress" | "events";
    /** Extra environment variables for the omp child process. */
    env?: Record<string, string | undefined>;
    /** Extra `config.yml` overlays passed as `--config`. */
    configOverlays?: string[];
    /** Emit thinking blocks as activity messages. */
    includeThinking?: boolean;
    /**
     * Test seam: supplies the RPC process. Production leaves it unset and the
     * runner spawns `omp` itself.
     */
    processFactory?: (options: OmpRpcProcessOptions) => OmpRpcProcessLike;
}
/** The slice of the RPC process the runner drives. */
export interface OmpRpcProcessLike {
    start(readyTimeoutMs?: number): Promise<unknown>;
    notify(frame: Record<string, unknown>): void;
    command(frame: Record<string, unknown>, timeoutMs?: number): Promise<OmpResponseFrame>;
    stop(): void;
    isRunning(): boolean;
    on(event: "frame", listener: (frame: OmpFrame) => void): unknown;
    on(event: "processError", listener: (error: Error) => void): unknown;
    on(event: "exit", listener: (info: {
        code: number | null;
        signal: NodeJS.Signals | null;
        stderr: string;
    }) => void): unknown;
}
export interface OmpRpcProcessOptions {
    ompPath: string;
    args: string[];
    cwd: string;
    env: Record<string, string | undefined>;
}
/** `get_session_stats` payload: omp's own accounting for the live session. */
export interface OmpSessionStats {
    assistantMessages?: number;
    toolCalls?: number;
    cost?: number;
    tokens?: {
        input?: number;
        output?: number;
        reasoning?: number;
        cacheRead?: number;
        cacheWrite?: number;
        total?: number;
    };
    routedModels?: Record<string, number>;
}
export interface OmpSessionInfo extends AgentSessionInfo {
    sessionId: string | null;
}
export interface OmpRunnerEvents {
    message: (message: SDKMessage) => void;
    error: (error: Error) => void;
    complete: (messages: SDKMessage[]) => void;
    frame: (frame: OmpFrame) => void;
}
/** Content block shape shared by omp tool results and message content. */
export interface OmpContentBlock {
    type: string;
    text?: string;
    thinking?: string;
    toolName?: string;
    toolCallId?: string;
    args?: unknown;
}
export interface OmpMessage {
    role?: string;
    content?: OmpContentBlock[];
}
/**
 * Frames emitted on omp's RPC stdout. Only the frames this runner consumes are
 * modeled; every other frame type arrives as `OmpUnknownFrame`, which is kept
 * out of this union so the `type` discriminator still narrows.
 */
export type OmpFrame = OmpReadyFrame | OmpResponseFrame | OmpToolExecutionStartFrame | OmpToolExecutionEndFrame | OmpMessageEndFrame | OmpAgentEndFrame | OmpSubagentFrame | OmpRetryFallbackFrame | OmpNoticeFrame | OmpExtensionUIRequestFrame | OmpChunkFrame;
export interface OmpChunkFrame {
    type: "rpc_chunk";
    chunkId: string;
    index: number;
    count: number;
    byteLength: number;
    data: string;
}
export interface OmpReadyFrame {
    type: "ready";
    protocolVersion: number;
    supportedProtocolVersions?: number[];
    maxFrameBytes?: number;
    maxReassembledFrameBytes?: number;
}
export interface OmpResponseFrame {
    type: "response";
    id?: string;
    command: string;
    success: boolean;
    error?: string;
    code?: string;
    data?: Record<string, unknown>;
}
export interface OmpToolExecutionStartFrame {
    type: "tool_execution_start";
    toolCallId: string;
    toolName: string;
    args?: unknown;
    intent?: string;
}
export interface OmpToolExecutionEndFrame {
    type: "tool_execution_end";
    toolCallId: string;
    toolName: string;
    isError?: boolean;
    result?: {
        content?: OmpContentBlock[];
        details?: unknown;
    };
}
export interface OmpMessageEndFrame {
    type: "message_end";
    message?: OmpMessage;
}
export interface OmpAgentEndFrame {
    type: "agent_end";
    messages?: OmpMessage[];
    isTerminal?: boolean;
}
export interface OmpSubagentFrame {
    type: "subagent_lifecycle" | "subagent_progress";
    subagentId?: string;
    label?: string;
    agent?: string;
    status?: string;
    phase?: string;
    message?: string;
}
/** omp switched models because the requested one was unavailable or exhausted. */
export interface OmpRetryFallbackFrame {
    type: "retry_fallback_applied";
    from?: string;
    to?: string;
    role?: string;
}
export interface OmpNoticeFrame {
    type: "notice";
    message?: string;
}
export interface OmpExtensionUIRequestFrame {
    type: "extension_ui_request";
    id: string;
    method: string;
    title?: string;
    message?: string;
    options?: string[];
    placeholder?: string;
}
export interface OmpUnknownFrame {
    type: string;
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map