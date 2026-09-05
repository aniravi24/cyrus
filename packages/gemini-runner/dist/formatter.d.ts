/**
 * Gemini Message Formatter
 *
 * Implements message formatting for Gemini CLI tool messages.
 * This formatter understands Gemini's specific tool format and converts
 * tool use/result messages into human-readable content for Linear.
 *
 * Gemini CLI tool names:
 * - read_file: Read file contents
 * - write_file: Write content to a file
 * - list_directory: List directory contents
 * - search_file_content: Search for patterns in files
 * - run_shell_command: Execute shell commands
 * - write_todos: Update task list
 * - replace: Edit/replace content in files
 */
import type { IMessageFormatter } from "cyrus-core";
import type { FormatterToolInput } from "./schemas.js";
export declare class GeminiMessageFormatter implements IMessageFormatter {
    /**
     * Format TodoWrite tool parameter as a nice checklist
     * @deprecated TodoWrite has been replaced by Task tools
     */
    formatTodoWriteParameter(jsonContent: string): string;
    /**
     * Format Task tool parameter (TaskCreate, TaskUpdate, TaskList, TaskGet)
     */
    formatTaskParameter(toolName: string, toolInput: FormatterToolInput): string;
    /**
     * Format tool input for display in Linear agent activities
     * Converts raw tool inputs into user-friendly parameter strings
     */
    formatToolParameter(toolName: string, toolInput: FormatterToolInput): string;
    /**
     * Format tool action name with description for shell command tool
     * Puts the description in round brackets after the tool name in the action field
     */
    formatToolActionName(toolName: string, toolInput: FormatterToolInput, isError: boolean): string;
    /**
     * Format tool result for display in Linear agent activities
     * Converts raw tool results into formatted Markdown
     */
    formatToolResult(toolName: string, toolInput: FormatterToolInput, result: string, isError: boolean): string;
}
//# sourceMappingURL=formatter.d.ts.map