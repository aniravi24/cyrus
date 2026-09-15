import type { AgentPendingWork } from "cyrus-core";
/**
 * Try to parse a buffered response body as a raw ScheduleWakeup tool-input
 * JSON (`{"delaySeconds": ..., "reason": ..., "prompt": ...}`). Returns null
 * when the content is anything else (real prose, other tools, invalid JSON).
 */
export declare function tryParseScheduleWakeupInput(content: string): {
    delaySeconds: number;
    reason?: string;
    prompt?: string;
} | null;
/**
 * Render a friendly Linear `response` body for a turn that ended on a
 * ScheduleWakeup call.
 */
export declare function formatScheduleWakeupResponse(input: {
    delaySeconds: number;
    reason?: string;
    prompt?: string;
}): string;
/**
 * Render the `thought` body posted after the response, declaring everything
 * that will wake the session later. Returns null when nothing is pending so
 * callers can skip posting.
 */
export declare function formatPendingWorkThought(pendingWork: AgentPendingWork): string | null;
//# sourceMappingURL=PendingWorkFormatter.d.ts.map