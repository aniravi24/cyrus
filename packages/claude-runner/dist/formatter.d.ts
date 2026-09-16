/**
 * Message Formatter Interface
 *
 * Defines the contract for formatting tool messages into human-readable content
 * suitable for display in Linear agent activities. Each runner implementation
 * should provide its own formatter that understands its specific message format.
 */
export interface IMessageFormatter {
    /**
     * Format TodoWrite tool parameter as a nice checklist
     * @deprecated TodoWrite has been replaced by Task tools (TaskCreate, TaskUpdate, etc.)
     * @param jsonContent - The raw JSON content from the TodoWrite tool
     * @returns Formatted checklist string with status emojis
     */
    formatTodoWriteParameter(jsonContent: string): string;
    /**
     * Format Task tool parameter (TaskCreate, TaskUpdate, TaskList, TaskGet)
     * @param toolName - The specific Task tool name (e.g., "TaskCreate", "TaskUpdate")
     * @param toolInput - The raw tool input object
     * @returns Formatted task information string
     */
    formatTaskParameter(toolName: string, toolInput: any): string;
    /**
     * Format tool input for display in Linear agent activities
     * Converts raw tool inputs into user-friendly parameter strings
     * @param toolName - The name of the tool (e.g., "Bash", "Read", "Grep")
     * @param toolInput - The raw tool input object
     * @returns User-friendly parameter string
     */
    formatToolParameter(toolName: string, toolInput: any): string;
    /**
     * Format tool action name with description for Bash tool
     * Puts the description in round brackets after the tool name in the action field
     * @param toolName - The name of the tool
     * @param toolInput - The raw tool input object
     * @param isError - Whether the tool result is an error
     * @returns Formatted action name (e.g., "Bash (List files)")
     */
    formatToolActionName(toolName: string, toolInput: any, isError: boolean): string;
    /**
     * Format tool result for display in Linear agent activities
     * Converts raw tool results into formatted Markdown
     * @param toolName - The name of the tool
     * @param toolInput - The raw tool input object
     * @param result - The raw tool result string
     * @param isError - Whether the result is an error
     * @returns Formatted Markdown string
     */
    formatToolResult(toolName: string, toolInput: any, result: string, isError: boolean): string;
}
/**
 * Claude Message Formatter
 *
 * Implements message formatting for Claude SDK tool messages.
 * This formatter understands Claude's specific tool format and converts
 * tool use/result messages into human-readable content for Linear.
 */
export declare class ClaudeMessageFormatter implements IMessageFormatter {
    /**
     * Format TodoWrite tool parameter as a nice checklist
     * @deprecated TodoWrite has been replaced by Task tools
     */
    formatTodoWriteParameter(jsonContent: string): string;
    /**
     * Format Task tool parameter (TaskCreate, TaskUpdate, TaskList, TaskGet)
     */
    formatTaskParameter(toolName: string, toolInput: any): string;
    /**
     * Format tool input for display in Linear agent activities
     * Converts raw tool inputs into user-friendly parameter strings
     */
    formatToolParameter(toolName: string, toolInput: any): string;
    /**
     * Format tool action name with description for Bash tool
     * Puts the description in round brackets after the tool name in the action field
     */
    formatToolActionName(toolName: string, toolInput: any, isError: boolean): string;
    /**
     * Format tool result for display in Linear agent activities
     * Converts raw tool results into formatted Markdown
     */
    formatToolResult(toolName: string, toolInput: any, result: string, isError: boolean): string;
}
//# sourceMappingURL=formatter.d.ts.map