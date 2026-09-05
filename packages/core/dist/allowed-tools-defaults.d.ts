/**
 * Per-platform default allowed-tool lists.
 *
 * These are the single source of truth for "what tools does Cyrus have access
 * to when a session is triggered by platform X". cyrus-hosted and any
 * self-host configuration imports these constants verbatim; the database
 * stores per-team overrides only, and falls back to these lists when a team
 * has not customized its allowed-tool set.
 *
 * Resolution is **additive only** — there is no implicit appending of
 * workspace MCP tools at runtime. Anything Cyrus needs (including
 * `mcp__linear`, `mcp__cyrus-tools`, `mcp__cyrus-docs`, `mcp__slack`, and
 * read access to repository paths) is listed here explicitly. If you remove
 * a tool from this list, Cyrus loses access to it. If you add a tool here,
 * existing teams whose column equals the previous verbatim default will be
 * migrated forward; teams who have customized their list are left alone.
 *
 * The three lists are intentionally maintained independently — sharing tools
 * between platforms is fine and expected, but the lists do not derive from
 * each other.
 */
/**
 * Default allowed tools for Linear-triggered agent sessions.
 *
 * Linear sessions are full engineering sessions — Cyrus opens worktrees,
 * runs builds, edits files, and opens PRs. This list mirrors the full
 * Claude Agent SDK toolset plus the workspace MCP prefixes Cyrus needs
 * to read and write Linear state.
 */
export declare const LINEAR_DEFAULT_ALLOWED_TOOLS: readonly ["Read", "Edit", "Write", "NotebookEdit", "Bash", "Task", "ListAgents", "WebFetch", "WebSearch", "EnterWorktree", "ExitWorktree", "SendMessage", "PushNotification", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput", "TaskStop", "CronCreate", "CronDelete", "CronList", "ScheduleWakeup", "Monitor", "LSP", "RemoteTrigger", "ToolSearch", "Skill", "DesignSync", "Workflow", "ReportFindings", "mcp__linear", "mcp__cyrus-tools", "mcp__cyrus-docs", "mcp__slack"];
/**
 * Default allowed tools for Slack `@mention` chat sessions.
 *
 * Slack sessions are transient — no PRs opened, no worktree checkouts.
 * The default list grants read-only access to repository sources (so Cyrus
 * can answer "look at the code in repo X" questions) plus the standard
 * planning/task tools, but no Edit/Write/general Bash. The single Bash
 * pattern allowed is `git -C * pull` so a chat session can refresh a
 * repo before grepping it.
 */
export declare const SLACK_DEFAULT_ALLOWED_TOOLS: readonly ["Read", "Bash(git -C * pull)", "WebFetch", "WebSearch", "SendMessage", "ScheduleWakeup", "Task", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput", "TaskStop", "Monitor", "Skill", "ToolSearch", "mcp__linear", "mcp__cyrus-tools", "mcp__cyrus-docs", "mcp__slack"];
/**
 * Default allowed tools for GitHub-triggered agent sessions.
 *
 * GitHub sessions are full engineering sessions like Linear (Cyrus opens
 * PRs, edits files, runs builds), so the toolset mirrors the Linear
 * default — except `mcp__slack` is excluded since Slack is its own
 * platform with its own allowed-tool list.
 *
 * Maintained as an independent list (NOT derived from
 * `LINEAR_DEFAULT_ALLOWED_TOOLS`) so the two can diverge without one of
 * them silently inheriting the other's changes.
 */
export declare const GITHUB_DEFAULT_ALLOWED_TOOLS: readonly ["Read", "Edit", "Write", "NotebookEdit", "Bash", "Task", "ListAgents", "WebFetch", "WebSearch", "EnterWorktree", "ExitWorktree", "SendMessage", "PushNotification", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput", "TaskStop", "CronCreate", "CronDelete", "CronList", "ScheduleWakeup", "Monitor", "LSP", "RemoteTrigger", "ToolSearch", "Skill", "DesignSync", "Workflow", "ReportFindings", "mcp__linear", "mcp__cyrus-tools", "mcp__cyrus-docs"];
/**
 * Platform identifier used by callers that want to resolve a default list
 * dynamically. Keeps platform-string typos out of the call sites.
 */
export type AllowedToolsPlatform = "linear" | "slack" | "github";
/**
 * Resolve the default allowed-tool list for a platform.
 */
export declare function getDefaultAllowedTools(platform: AllowedToolsPlatform): readonly string[];
//# sourceMappingURL=allowed-tools-defaults.d.ts.map