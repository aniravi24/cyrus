import type { IMessageFormatter } from "cyrus-core";
export declare class OpenCodeMessageFormatter implements IMessageFormatter {
    formatTodoWriteParameter(jsonContent: string): string;
    formatTaskParameter(toolName: string, toolInput: unknown): string;
    formatToolParameter(toolName: string, toolInput: unknown): string;
    formatToolActionName(toolName: string, toolInput: unknown, _isError: boolean): string;
    formatToolResult(_toolName: string, _toolInput: unknown, result: string, isError: boolean): string;
}
//# sourceMappingURL=formatter.d.ts.map