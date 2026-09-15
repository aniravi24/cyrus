/**
 * Claude CLI configuration helpers
 *
 * Skills Documentation:
 * - Claude Code CLI: https://code.claude.com/docs/en/skills
 * - Agent SDK: https://platform.claude.com/docs/en/agent-sdk/skills
 *
 * IMPORTANT: The `allowed-tools` frontmatter field in SKILL.md is only supported
 * when using Claude Code CLI directly. It does not apply when using Skills through
 * the SDK. When using the SDK, control tool access through the main `allowedTools`
 * option in your query configuration.
 */
/**
 * List of all available tools in Claude Code
 */
export declare const availableTools: readonly ["Read(**)", "Edit(**)", "Write(**)", "Bash", "Task", "ListAgents", "WebFetch", "WebSearch", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "NotebookEdit", "Skill", "SendMessage", "PushNotification", "EnterWorktree", "ExitWorktree", "CronCreate", "CronDelete", "CronList", "ScheduleWakeup", "Monitor", "LSP", "RemoteTrigger", "TaskOutput", "TaskStop", "ToolSearch", "DesignSync", "Workflow", "ReportFindings"];
export type ToolName = (typeof availableTools)[number];
/**
 * Default read-only tools that are safe to enable
 * Note: Task tools are included as they only modify task tracking, not actual code files
 * Note: Skill is included as it enables Claude to use Skills which are packaged capabilities
 */
export declare const readOnlyTools: ToolName[];
/**
 * Tools that can modify the file system or state
 */
export declare const writeTools: ToolName[];
/**
 * Get a safe set of tools for read-only operations
 */
export declare function getReadOnlyTools(): string[];
/**
 * Get all available tools
 */
export declare function getAllTools(): string[];
/**
 * Get all tools except Bash (safer default for repository configuration)
 */
export declare function getSafeTools(): string[];
/**
 * Get coordinator tools - all tools except those that can edit files
 * Excludes: Edit, Write, NotebookEdit (no file/content modification)
 * Used by orchestrator role for coordination without direct file modification
 */
export declare function getCoordinatorTools(): string[];
//# sourceMappingURL=config.d.ts.map