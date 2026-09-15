import type { IMessageFormatter } from "cyrus-core";
/**
 * Codex formatter for tool activity messages in Linear.
 * Uses conservative formatting because Codex tool schemas vary by runtime.
 */
export declare class CodexMessageFormatter implements IMessageFormatter {
    formatTodoWriteParameter(jsonContent: string): string;
    formatTaskParameter(toolName: string, toolInput: any): string;
    formatToolParameter(toolName: string, toolInput: any): string;
    formatToolActionName(toolName: string, toolInput: any, _isError: boolean): string;
    formatToolResult(_toolName: string, _toolInput: any, result: string, isError: boolean): string;
}
//# sourceMappingURL=formatter.d.ts.map