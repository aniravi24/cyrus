import type { IMessageFormatter } from "cyrus-core";
/**
 * Formats omp tool activity for the issue-tracker timeline. omp tool inputs are
 * flat and already named for humans, so the subject is a named argument rather
 * than a per-tool rendering.
 */
export declare class OmpMessageFormatter implements IMessageFormatter {
    formatTodoWriteParameter(jsonContent: string): string;
    formatTaskParameter(toolName: string, toolInput: unknown): string;
    formatToolParameter(toolName: string, toolInput: unknown): string;
    formatToolActionName(toolName: string, toolInput: unknown, isError: boolean): string;
    formatToolResult(_toolName: string, _toolInput: unknown, result: string, isError: boolean): string;
}
//# sourceMappingURL=formatter.d.ts.map