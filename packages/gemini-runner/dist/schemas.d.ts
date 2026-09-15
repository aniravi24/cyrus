/**
 * Zod Schemas for Gemini CLI Stream Events
 *
 * These schemas provide runtime validation for Gemini CLI's stream-json output format.
 * TypeScript types are derived from these schemas using z.infer<> for type safety.
 *
 * Note: The official Gemini CLI core package exports TypeScript interfaces for
 * these event types. However, we use custom Zod schemas because:
 * 1. Runtime validation - official types are TypeScript-only, no runtime checks
 * 2. Detailed tool typing - official uses `Record<string, unknown>` for tool params
 * 3. Type guards and parsers - utility functions for narrowing event/tool types
 * 4. Tool result typing - result schemas typed by tool_id prefix
 *
 * Our schemas are structurally compatible with the official types.
 *
 * Official type definitions (pinned to v0.17.0):
 * @see https://github.com/google-gemini/gemini-cli/blob/v0.17.0/packages/core/src/output/types.ts
 * @see https://www.npmjs.com/package/@google/gemini-cli-core/v/0.17.0
 *
 * Documentation:
 * @see https://github.com/google-gemini/gemini-cli/blob/v0.17.0/docs/cli/headless.md
 */
import { z } from "zod";
/**
 * Session initialization event
 *
 * Example:
 * ```json
 * {"type":"init","timestamp":"2025-11-25T03:27:51.000Z","session_id":"c25acda3-b51f-41f9-9bc5-954c70c17bf4","model":"auto"}
 * ```
 */
export declare const GeminiInitEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"init">;
    timestamp: z.ZodString;
    session_id: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>;
/**
 * User or assistant message event
 *
 * When delta is true, this message should be accumulated with previous delta messages
 * of the same role. The caller (GeminiRunner) is responsible for accumulating delta messages.
 *
 * Examples:
 * ```json
 * {"type":"message","timestamp":"2025-11-25T03:27:51.001Z","role":"user","content":"What is 2 + 2?"}
 * {"type":"message","timestamp":"2025-11-25T03:28:05.256Z","role":"assistant","content":"2 + 2 = 4.","delta":true}
 * ```
 */
export declare const GeminiMessageEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"message">;
    timestamp: z.ZodString;
    role: z.ZodEnum<{
        user: "user";
        assistant: "assistant";
    }>;
    content: z.ZodString;
    delta: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Parameters for the read_file tool
 *
 * Example:
 * ```json
 * {"file_path":"package.json"}
 * {"file_path":"app/mcts.py"}
 * ```
 */
export declare const ReadFileParametersSchema: z.ZodObject<{
    file_path: z.ZodString;
}, z.core.$strip>;
/**
 * Parameters for the write_file tool
 *
 * Example:
 * ```json
 * {"file_path":"tests/test_snake.py","content":"import unittest\n..."}
 * ```
 */
export declare const WriteFileParametersSchema: z.ZodObject<{
    file_path: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>;
/**
 * Parameters for the list_directory tool
 *
 * Example:
 * ```json
 * {"dir_path":"."}
 * {"dir_path":"./src"}
 * ```
 */
export declare const ListDirectoryParametersSchema: z.ZodObject<{
    dir_path: z.ZodString;
}, z.core.$strip>;
/**
 * Parameters for the search_file_content tool
 *
 * Example:
 * ```json
 * {"pattern":"(TODO|FIXME)"}
 * {"pattern":"function.*export"}
 * ```
 */
export declare const SearchFileContentParametersSchema: z.ZodObject<{
    pattern: z.ZodString;
}, z.core.$strip>;
/**
 * Parameters for the run_shell_command tool
 *
 * Example:
 * ```json
 * {"command":"/usr/bin/python3 -m pytest tests/"}
 * {"command":"git status"}
 * {"command":"flake8 --version"}
 * ```
 */
export declare const RunShellCommandParametersSchema: z.ZodObject<{
    command: z.ZodString;
}, z.core.$strip>;
/**
 * Todo item for the write_todos tool
 */
export declare const TodoItemSchema: z.ZodObject<{
    description: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        in_progress: "in_progress";
        completed: "completed";
    }>>;
}, z.core.$strip>;
/**
 * Parameters for the write_todos tool
 *
 * Example:
 * ```json
 * {"todos":[{"description":"Explore codebase to identify bugs","status":"in_progress"},{"description":"Fix coordinate system","status":"pending"}]}
 * ```
 */
export declare const WriteTodosParametersSchema: z.ZodObject<{
    todos: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        status: z.ZodOptional<z.ZodEnum<{
            pending: "pending";
            in_progress: "in_progress";
            completed: "completed";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Parameters for the replace tool (AI-powered code editing)
 *
 * Can use either instruction-based or literal string replacement:
 * - instruction: Natural language description of the change
 * - old_string/new_string: Literal string replacement
 *
 * Examples:
 * Instruction-based:
 * ```json
 * {"instruction":"Modify get_other_snake_heads to return a list instead of dict","file_path":"app/mcts.py"}
 * {"instruction":"Clean up comments in is_terminal.","file_path":"app/mcts.py"}
 * ```
 *
 * Literal replacement:
 * ```json
 * {"file_path":"app/mcts.py","old_string":"    # Simulate other snakes' moves\\n    othe","new_string":"    # Track enemy positions\\n    enemy"}
 * ```
 */
export declare const ReplaceParametersSchema: z.ZodObject<{
    instruction: z.ZodOptional<z.ZodString>;
    file_path: z.ZodOptional<z.ZodString>;
    old_string: z.ZodOptional<z.ZodString>;
    new_string: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Union of all known tool parameter schemas
 */
export declare const GeminiToolParametersSchema: z.ZodUnion<readonly [z.ZodObject<{
    file_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    file_path: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    dir_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    pattern: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    command: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    todos: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        status: z.ZodOptional<z.ZodEnum<{
            pending: "pending";
            in_progress: "in_progress";
            completed: "completed";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    instruction: z.ZodOptional<z.ZodString>;
    file_path: z.ZodOptional<z.ZodString>;
    old_string: z.ZodOptional<z.ZodString>;
    new_string: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
export type ReadFileParameters = z.infer<typeof ReadFileParametersSchema>;
export type WriteFileParameters = z.infer<typeof WriteFileParametersSchema>;
export type ListDirectoryParameters = z.infer<typeof ListDirectoryParametersSchema>;
export type SearchFileContentParameters = z.infer<typeof SearchFileContentParametersSchema>;
export type RunShellCommandParameters = z.infer<typeof RunShellCommandParametersSchema>;
export type TodoItem = z.infer<typeof TodoItemSchema>;
export type WriteTodosParameters = z.infer<typeof WriteTodosParametersSchema>;
export type ReplaceParameters = z.infer<typeof ReplaceParametersSchema>;
export type GeminiToolParameters = z.infer<typeof GeminiToolParametersSchema>;
/**
 * Type for tool input parameters used by GeminiMessageFormatter
 *
 * This is a permissive type that allows accessing any property while still
 * being more explicit than `any`. It represents the union of:
 * - Known Gemini CLI tool parameters (read_file, write_file, etc.)
 * - Unknown tool parameters from MCP or future tools
 *
 * We use Record<string, unknown> instead of a discriminated union because:
 * 1. The formatter uses switch on toolName (string), not on input structure
 * 2. Properties are accessed dynamically based on the tool type
 * 3. TypeScript can't narrow Record types based on external string values
 *
 * Known properties that may exist (based on Gemini tools):
 * - file_path: string (read_file, write_file, replace)
 * - content: string (write_file)
 * - dir_path: string (list_directory)
 * - pattern: string (search_file_content)
 * - command: string (run_shell_command)
 * - description: string (run_shell_command, todos)
 * - todos: Array<{description, status}> (write_todos)
 * - instruction: string (replace)
 * - old_string: string (replace)
 * - new_string: string (replace)
 */
export type FormatterToolInput = Record<string, unknown>;
/**
 * Typed read_file tool use event
 */
export declare const ReadFileToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodLiteral<"read_file">;
    parameters: z.ZodObject<{
        file_path: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Typed write_file tool use event
 */
export declare const WriteFileToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodLiteral<"write_file">;
    parameters: z.ZodObject<{
        file_path: z.ZodString;
        content: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Typed list_directory tool use event
 */
export declare const ListDirectoryToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodLiteral<"list_directory">;
    parameters: z.ZodObject<{
        dir_path: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Typed search_file_content tool use event
 */
export declare const SearchFileContentToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodLiteral<"search_file_content">;
    parameters: z.ZodObject<{
        pattern: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Typed run_shell_command tool use event
 */
export declare const RunShellCommandToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodLiteral<"run_shell_command">;
    parameters: z.ZodObject<{
        command: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Typed write_todos tool use event
 */
export declare const WriteTodosToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodLiteral<"write_todos">;
    parameters: z.ZodObject<{
        todos: z.ZodArray<z.ZodObject<{
            description: z.ZodString;
            status: z.ZodOptional<z.ZodEnum<{
                pending: "pending";
                in_progress: "in_progress";
                completed: "completed";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Typed replace tool use event
 */
export declare const ReplaceToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodLiteral<"replace">;
    parameters: z.ZodObject<{
        instruction: z.ZodOptional<z.ZodString>;
        file_path: z.ZodOptional<z.ZodString>;
        old_string: z.ZodOptional<z.ZodString>;
        new_string: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Unknown tool use event (for tools not explicitly typed)
 */
export declare const UnknownToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    tool_name: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type ReadFileToolUseEvent = z.infer<typeof ReadFileToolUseEventSchema>;
export type WriteFileToolUseEvent = z.infer<typeof WriteFileToolUseEventSchema>;
export type ListDirectoryToolUseEvent = z.infer<typeof ListDirectoryToolUseEventSchema>;
export type SearchFileContentToolUseEvent = z.infer<typeof SearchFileContentToolUseEventSchema>;
export type RunShellCommandToolUseEvent = z.infer<typeof RunShellCommandToolUseEventSchema>;
export type WriteTodosToolUseEvent = z.infer<typeof WriteTodosToolUseEventSchema>;
export type ReplaceToolUseEvent = z.infer<typeof ReplaceToolUseEventSchema>;
export type UnknownToolUseEvent = z.infer<typeof UnknownToolUseEventSchema>;
/**
 * Tool use event - represents a tool invocation by the model
 *
 * The tool_id is assigned by Gemini CLI and follows the format:
 * `{tool_name}-{timestamp_ms}-{random_hex}`
 *
 * Example:
 * ```json
 * {"type":"tool_use","timestamp":"2025-11-25T03:27:54.691Z","tool_name":"list_directory","tool_id":"list_directory-1764041274691-eabd3cbcdee66","parameters":{"dir_path":"."}}
 * {"type":"tool_use","timestamp":"2025-11-25T03:27:54.691Z","tool_name":"read_file","tool_id":"read_file-1764041274691-e1084c2fd73dc","parameters":{"file_path":"test.ts"}}
 * ```
 */
export declare const GeminiToolUseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_name: z.ZodString;
    tool_id: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
/**
 * Tool result event - the result of a tool execution
 *
 * Uses tool_id (not tool_name) to match the corresponding tool_use event.
 * Contains either output (success) or error (failure).
 *
 * Examples:
 * Success:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-25T03:27:54.724Z","tool_id":"list_directory-1764041274691-eabd3cbcdee66","status":"success","output":"Listed 2 item(s)."}
 * ```
 *
 * Error:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-25T03:28:13.200Z","tool_id":"read_file-1764041293170-fd5f6da4bd4a1","status":"error","output":"File path must be within...","error":{"type":"invalid_tool_params","message":"File path must be within..."}}
 * ```
 */
export declare const GeminiToolResultEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Tool result output types based on the originating tool
 *
 * These describe the expected output format for each tool type.
 * The tool_id prefix indicates which tool generated the result.
 */
/**
 * read_file tool result - returns empty string on success (file content is in context)
 *
 * Example:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T20:12:40.148Z","tool_id":"read_file-1764015160012-767cb93e436f3","status":"success","output":""}
 * ```
 */
export declare const ReadFileToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * write_file tool result - returns empty output on success
 *
 * Example:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T20:13:55.193Z","tool_id":"write_file-1764015234674-0581b9629931a","status":"success"}
 * ```
 */
export declare const WriteFileToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * list_directory tool result - returns summary of items found
 *
 * Example:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T20:12:53.273Z","tool_id":"list_directory-1764015173255-396a90dd79fa6","status":"success","output":"Listed 4 item(s). (1 ignored)"}
 * ```
 */
export declare const ListDirectoryToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * search_file_content tool result - returns match info or "No matches found"
 *
 * Example:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T20:12:40.196Z","tool_id":"search_file_content-1764015160072-c1e0f530591f6","status":"success","output":"No matches found"}
 * ```
 */
export declare const SearchFileContentToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * run_shell_command tool result - returns command output
 *
 * Examples:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T20:13:15.060Z","tool_id":"run_shell_command-1764015194969-e79bcda1d6e9","status":"success","output":"/usr/bin/python3: No module named pytest"}
 * {"type":"tool_result","timestamp":"2025-11-24T20:19:49.805Z","tool_id":"run_shell_command-1764015589776-b029531d6e71e","status":"success","output":"node"}
 * ```
 */
export declare const RunShellCommandToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * write_todos tool result - returns empty output on success, or error if invalid
 *
 * Examples:
 * Success:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T19:29:56.539Z","tool_id":"write_todos-1764012596037-37082c9903ce7","status":"success"}
 * ```
 *
 * Error (multiple in_progress):
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T19:37:13.465Z","tool_id":"write_todos-1764013031965-70bbdf7c35856","status":"error","output":"Invalid parameters: Only one task can be \"in_progress\" at a time."}
 * ```
 */
export declare const WriteTodosToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * replace tool result - returns empty output on success
 *
 * Example:
 * ```json
 * {"type":"tool_result","timestamp":"2025-11-24T19:31:12.165Z","tool_id":"replace-1764012672140-c56f46960e14a","status":"success"}
 * ```
 */
export declare const ReplaceToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ReadFileToolResult = z.infer<typeof ReadFileToolResultSchema>;
export type WriteFileToolResult = z.infer<typeof WriteFileToolResultSchema>;
export type ListDirectoryToolResult = z.infer<typeof ListDirectoryToolResultSchema>;
export type SearchFileContentToolResult = z.infer<typeof SearchFileContentToolResultSchema>;
export type RunShellCommandToolResult = z.infer<typeof RunShellCommandToolResultSchema>;
export type WriteTodosToolResult = z.infer<typeof WriteTodosToolResultSchema>;
export type ReplaceToolResult = z.infer<typeof ReplaceToolResultSchema>;
/**
 * Type guards for tool results based on tool_id prefix
 */
export declare function isReadFileToolResult(event: GeminiToolResultEvent): event is ReadFileToolResult;
export declare function isWriteFileToolResult(event: GeminiToolResultEvent): event is WriteFileToolResult;
export declare function isListDirectoryToolResult(event: GeminiToolResultEvent): event is ListDirectoryToolResult;
export declare function isSearchFileContentToolResult(event: GeminiToolResultEvent): event is SearchFileContentToolResult;
export declare function isRunShellCommandToolResult(event: GeminiToolResultEvent): event is RunShellCommandToolResult;
export declare function isWriteTodosToolResult(event: GeminiToolResultEvent): event is WriteTodosToolResult;
export declare function isReplaceToolResult(event: GeminiToolResultEvent): event is ReplaceToolResult;
/**
 * Extract tool name from tool_id
 *
 * Tool IDs follow the format: `{tool_name}-{timestamp_ms}-{random_hex}`
 *
 * @param toolId - The tool_id from a tool_use or tool_result event
 * @returns The tool name, or null if format is invalid
 */
export declare function extractToolNameFromId(toolId: string): string | null;
/**
 * Non-fatal error event
 *
 * Example:
 * ```json
 * {"type":"error","timestamp":"2025-11-25T03:28:00.000Z","message":"Rate limit exceeded","code":429}
 * ```
 */
export declare const GeminiErrorEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"error">;
    timestamp: z.ZodString;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Final result event with session statistics
 *
 * Examples:
 * Success:
 * ```json
 * {"type":"result","timestamp":"2025-11-25T03:28:05.262Z","status":"success","stats":{"total_tokens":8064,"input_tokens":7854,"output_tokens":58,"duration_ms":2534,"tool_calls":0}}
 * ```
 *
 * Error:
 * ```json
 * {"type":"result","timestamp":"2025-11-25T03:27:54.727Z","status":"error","error":{"type":"FatalTurnLimitedError","message":"Reached max session turns..."},"stats":{"total_tokens":8255,"input_tokens":7862,"output_tokens":90,"duration_ms":0,"tool_calls":2}}
 * ```
 */
export declare const GeminiResultEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"result">;
    timestamp: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    stats: z.ZodOptional<z.ZodObject<{
        total_tokens: z.ZodOptional<z.ZodNumber>;
        input_tokens: z.ZodOptional<z.ZodNumber>;
        output_tokens: z.ZodOptional<z.ZodNumber>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
        tool_calls: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Discriminated union of all Gemini stream events
 *
 * Uses the 'type' field as the discriminator for type narrowing.
 */
export declare const GeminiStreamEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"init">;
    timestamp: z.ZodString;
    session_id: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"message">;
    timestamp: z.ZodString;
    role: z.ZodEnum<{
        user: "user";
        assistant: "assistant";
    }>;
    content: z.ZodString;
    delta: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool_use">;
    timestamp: z.ZodString;
    tool_name: z.ZodString;
    tool_id: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    timestamp: z.ZodString;
    tool_id: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    timestamp: z.ZodString;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"result">;
    timestamp: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        success: "success";
    }>;
    stats: z.ZodOptional<z.ZodObject<{
        total_tokens: z.ZodOptional<z.ZodNumber>;
        input_tokens: z.ZodOptional<z.ZodNumber>;
        output_tokens: z.ZodOptional<z.ZodNumber>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
        tool_calls: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>], "type">;
export type GeminiInitEvent = z.infer<typeof GeminiInitEventSchema>;
export type GeminiMessageEvent = z.infer<typeof GeminiMessageEventSchema>;
export type GeminiToolUseEvent = z.infer<typeof GeminiToolUseEventSchema>;
export type GeminiToolResultEvent = z.infer<typeof GeminiToolResultEventSchema>;
export type GeminiErrorEvent = z.infer<typeof GeminiErrorEventSchema>;
export type GeminiResultEvent = z.infer<typeof GeminiResultEventSchema>;
export type GeminiStreamEvent = z.infer<typeof GeminiStreamEventSchema>;
/**
 * Parse and validate a Gemini stream event from a JSON string
 *
 * @param jsonString - Raw JSON string from Gemini CLI stdout
 * @returns Validated and typed GeminiStreamEvent
 * @throws ZodError if validation fails
 */
export declare function parseGeminiStreamEvent(jsonString: string): GeminiStreamEvent;
/**
 * Safely parse a Gemini stream event, returning null on failure
 *
 * @param jsonString - Raw JSON string from Gemini CLI stdout
 * @returns Validated GeminiStreamEvent or null if parsing/validation fails
 */
export declare function safeParseGeminiStreamEvent(jsonString: string): GeminiStreamEvent | null;
/**
 * Type guard for checking if an event is a specific type
 */
export declare function isGeminiInitEvent(event: GeminiStreamEvent): event is GeminiInitEvent;
export declare function isGeminiMessageEvent(event: GeminiStreamEvent): event is GeminiMessageEvent;
export declare function isGeminiToolUseEvent(event: GeminiStreamEvent): event is GeminiToolUseEvent;
export declare function isGeminiToolResultEvent(event: GeminiStreamEvent): event is GeminiToolResultEvent;
export declare function isGeminiErrorEvent(event: GeminiStreamEvent): event is GeminiErrorEvent;
export declare function isGeminiResultEvent(event: GeminiStreamEvent): event is GeminiResultEvent;
/**
 * Parse a tool use event as a specific typed tool
 *
 * @param event - A GeminiToolUseEvent to parse
 * @returns The typed tool use event, or null if the tool name doesn't match or validation fails
 */
export declare function parseAsReadFileTool(event: GeminiToolUseEvent): ReadFileToolUseEvent | null;
export declare function parseAsWriteFileTool(event: GeminiToolUseEvent): WriteFileToolUseEvent | null;
export declare function parseAsListDirectoryTool(event: GeminiToolUseEvent): ListDirectoryToolUseEvent | null;
export declare function parseAsSearchFileContentTool(event: GeminiToolUseEvent): SearchFileContentToolUseEvent | null;
export declare function parseAsRunShellCommandTool(event: GeminiToolUseEvent): RunShellCommandToolUseEvent | null;
export declare function parseAsWriteTodosTool(event: GeminiToolUseEvent): WriteTodosToolUseEvent | null;
export declare function parseAsReplaceTool(event: GeminiToolUseEvent): ReplaceToolUseEvent | null;
/**
 * Type guard for specific tool types based on tool_name
 */
export declare function isReadFileTool(event: GeminiToolUseEvent): event is ReadFileToolUseEvent;
export declare function isWriteFileTool(event: GeminiToolUseEvent): event is WriteFileToolUseEvent;
export declare function isListDirectoryTool(event: GeminiToolUseEvent): event is ListDirectoryToolUseEvent;
export declare function isSearchFileContentTool(event: GeminiToolUseEvent): event is SearchFileContentToolUseEvent;
export declare function isRunShellCommandTool(event: GeminiToolUseEvent): event is RunShellCommandToolUseEvent;
export declare function isWriteTodosTool(event: GeminiToolUseEvent): event is WriteTodosToolUseEvent;
export declare function isReplaceTool(event: GeminiToolUseEvent): event is ReplaceToolUseEvent;
//# sourceMappingURL=schemas.d.ts.map