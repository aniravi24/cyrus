import type { SDKMessage } from "cyrus-core";
import type { NormalizedCodexEvent } from "./backend/types.js";
export declare const DEFAULT_CODEX_MODEL = "gpt-5.5";
/**
 * Dependencies the mapper needs from its owner (the runner). Keeps the mapper
 * free of session-lifecycle ownership while letting it read session identity
 * and push messages out.
 */
export interface MapperContext {
    workingDirectory?: string;
    model?: string;
    /** Current session id, or "pending" before the thread id is known. */
    getSessionId(): string;
    /** Skills staged for this run (surfaced in the init message). */
    getStagedSkillNames(): string[];
    /** Emit a message to listeners (and append to the session list). */
    emitMessage(message: SDKMessage): void;
    /** Called when the backend reports the thread id, before the init message. */
    onThreadStarted(threadId: string): void;
}
/**
 * Translates backend-neutral {@link NormalizedCodexEvent}s into Cyrus
 * `SDKMessage`s and accumulates the session message list. Single responsibility:
 * event → message mapping. Knows nothing about transports or session lifecycle.
 */
export declare class CodexEventMapper {
    private readonly ctx;
    private messages;
    private hasInitMessage;
    private pendingResultMessage;
    private lastAssistantText;
    private lastUsage;
    private errorMessages;
    private startTimestampMs;
    private emittedToolUseIds;
    constructor(ctx: MapperContext);
    reset(): void;
    getMessages(): SDKMessage[];
    handle(event: NormalizedCodexEvent): void;
    /**
     * Build and emit the terminal result message (and init, if a turn never
     * started). Returns the full message list for the runner's `complete` event.
     */
    finalize(opts: {
        caughtError?: unknown;
        wasStopped: boolean;
    }): SDKMessage[];
    private pushAndEmit;
    private projectItemToTool;
    private emitToolMessagesForItem;
    private emitAssistantMessage;
    private emitSystemInitMessage;
    private createSuccessResultMessage;
    private createErrorResultMessage;
}
//# sourceMappingURL=CodexEventMapper.d.ts.map