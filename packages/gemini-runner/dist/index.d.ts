/**
 * @module cyrus-gemini-runner
 *
 * Gemini CLI integration for Cyrus agent framework.
 * Provides a provider-agnostic wrapper around the Gemini CLI that implements
 * the IAgentRunner interface, allowing seamless switching between Claude and Gemini.
 *
 * @example
 * ```typescript
 * import { GeminiRunner } from 'cyrus-gemini-runner';
 *
 * const runner = new GeminiRunner({
 *   cyrusHome: '/home/user/.cyrus',
 *   workingDirectory: '/path/to/repo',
 *   model: 'gemini-2.5-flash',
 *   autoApprove: true
 * });
 *
 * // Start a session
 * const session = await runner.start("Analyze this codebase");
 * console.log(`Session ID: ${session.sessionId}`);
 *
 * // Get messages
 * const messages = runner.getMessages();
 * console.log(`Received ${messages.length} messages`);
 * ```
 */
export { createUserMessage, extractSessionId, geminiEventToSDKMessage, } from "./adapters.js";
export { GeminiMessageFormatter } from "./formatter.js";
export { GeminiRunner } from "./GeminiRunner.js";
export { SimpleGeminiRunner } from "./SimpleGeminiRunner.js";
export { extractToolNameFromId, GeminiErrorEventSchema, GeminiInitEventSchema, GeminiMessageEventSchema, GeminiResultEventSchema, GeminiStreamEventSchema, GeminiToolParametersSchema, GeminiToolResultEventSchema, GeminiToolUseEventSchema, isGeminiErrorEvent, isGeminiInitEvent, isGeminiMessageEvent, isGeminiResultEvent, isGeminiToolResultEvent, isGeminiToolUseEvent, isListDirectoryTool, isListDirectoryToolResult, isReadFileTool, isReadFileToolResult, isReplaceTool, isReplaceToolResult, isRunShellCommandTool, isRunShellCommandToolResult, isSearchFileContentTool, isSearchFileContentToolResult, isWriteFileTool, isWriteFileToolResult, isWriteTodosTool, isWriteTodosToolResult, ListDirectoryParametersSchema, ListDirectoryToolResultSchema, ListDirectoryToolUseEventSchema, parseAsListDirectoryTool, parseAsReadFileTool, parseAsReplaceTool, parseAsRunShellCommandTool, parseAsSearchFileContentTool, parseAsWriteFileTool, parseAsWriteTodosTool, parseGeminiStreamEvent, ReadFileParametersSchema, ReadFileToolResultSchema, ReadFileToolUseEventSchema, ReplaceParametersSchema, ReplaceToolResultSchema, ReplaceToolUseEventSchema, RunShellCommandParametersSchema, RunShellCommandToolResultSchema, RunShellCommandToolUseEventSchema, SearchFileContentParametersSchema, SearchFileContentToolResultSchema, SearchFileContentToolUseEventSchema, safeParseGeminiStreamEvent, TodoItemSchema, UnknownToolUseEventSchema, WriteFileParametersSchema, WriteFileToolResultSchema, WriteFileToolUseEventSchema, WriteTodosParametersSchema, WriteTodosToolResultSchema, WriteTodosToolUseEventSchema, } from "./schemas.js";
export { autoDetectMcpConfig, backupGeminiSettings, convertToGeminiMcpConfig, deleteGeminiSettings, type GeminiSettingsOptions, loadMcpConfigFromPaths, restoreGeminiSettings, setupGeminiSettings, writeGeminiSettings, } from "./settingsGenerator.js";
export { SystemPromptManager } from "./systemPromptManager.js";
export type { GeminiErrorEvent, GeminiInitEvent, GeminiMcpServerConfig, GeminiMessageEvent, GeminiResultEvent, GeminiRunnerConfig, GeminiRunnerEvents, GeminiSessionInfo, GeminiStreamEvent, GeminiToolParameters, GeminiToolResultEvent, GeminiToolUseEvent, ListDirectoryParameters, ListDirectoryToolResult, ListDirectoryToolUseEvent, McpServerConfig, ReadFileParameters, ReadFileToolResult, ReadFileToolUseEvent, ReplaceParameters, ReplaceToolResult, ReplaceToolUseEvent, RunShellCommandParameters, RunShellCommandToolResult, RunShellCommandToolUseEvent, SearchFileContentParameters, SearchFileContentToolResult, SearchFileContentToolUseEvent, TodoItem, UnknownToolUseEvent, WriteFileParameters, WriteFileToolResult, WriteFileToolUseEvent, WriteTodosParameters, WriteTodosToolResult, WriteTodosToolUseEvent, } from "./types.js";
//# sourceMappingURL=index.d.ts.map