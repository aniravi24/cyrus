/**
 * Type definitions for Gemini Runner
 *
 * Event types are derived from Zod schemas in schemas.ts for runtime validation.
 * Configuration and session types remain as interfaces.
 */
// Re-export schemas for runtime validation
export { 
// Parsing utilities
extractToolNameFromId, 
// Event schemas
GeminiErrorEventSchema, GeminiInitEventSchema, GeminiMessageEventSchema, GeminiResultEventSchema, GeminiStreamEventSchema, 
// Tool parameter schemas
GeminiToolParametersSchema, GeminiToolResultEventSchema, GeminiToolUseEventSchema, 
// Event type guards
isGeminiErrorEvent, isGeminiInitEvent, isGeminiMessageEvent, isGeminiResultEvent, isGeminiToolResultEvent, isGeminiToolUseEvent, 
// Tool use type guards
isListDirectoryTool, 
// Tool result type guards
isListDirectoryToolResult, isReadFileTool, isReadFileToolResult, isReplaceTool, isReplaceToolResult, isRunShellCommandTool, isRunShellCommandToolResult, isSearchFileContentTool, isSearchFileContentToolResult, isWriteFileTool, isWriteFileToolResult, isWriteTodosTool, isWriteTodosToolResult, ListDirectoryParametersSchema, 
// Tool result schemas
ListDirectoryToolResultSchema, ListDirectoryToolUseEventSchema, parseAsListDirectoryTool, parseAsReadFileTool, parseAsReplaceTool, parseAsRunShellCommandTool, parseAsSearchFileContentTool, parseAsWriteFileTool, parseAsWriteTodosTool, parseGeminiStreamEvent, ReadFileParametersSchema, ReadFileToolResultSchema, ReadFileToolUseEventSchema, ReplaceParametersSchema, ReplaceToolResultSchema, ReplaceToolUseEventSchema, RunShellCommandParametersSchema, RunShellCommandToolResultSchema, RunShellCommandToolUseEventSchema, SearchFileContentParametersSchema, SearchFileContentToolResultSchema, SearchFileContentToolUseEventSchema, safeParseGeminiStreamEvent, TodoItemSchema, UnknownToolUseEventSchema, WriteFileParametersSchema, WriteFileToolResultSchema, WriteFileToolUseEventSchema, WriteTodosParametersSchema, WriteTodosToolResultSchema, WriteTodosToolUseEventSchema, } from "./schemas.js";
//# sourceMappingURL=types.js.map