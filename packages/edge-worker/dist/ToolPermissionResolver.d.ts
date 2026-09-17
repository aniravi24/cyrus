import type { EdgeWorkerConfig, ILogger, RepositoryConfig } from "cyrus-core";
/** Prompt type used for label-based tool/prompt selection */
export type PromptType = "debugger" | "builder" | "scoper" | "orchestrator" | "graphite-orchestrator";
/**
 * Unified tool permission resolver for issue, chat, and webhook-triggered
 * sessions.
 *
 * The resolver is **additive only**: it never appends or strips tools after
 * the explicit list is chosen. The per-platform defaults live in cyrus-core
 * (`LINEAR_DEFAULT_ALLOWED_TOOLS`, `SLACK_DEFAULT_ALLOWED_TOOLS`,
 * `GITHUB_DEFAULT_ALLOWED_TOOLS`) and include workspace MCP prefixes
 * (`mcp__linear`, `mcp__cyrus-tools`, etc.) explicitly. Callers that want a
 * tighter list pass `linearAllowedTools` / `slackAllowedTools` /
 * `githubAllowedTools` on `EdgeWorkerConfig`, or set repo-level
 * `allowedTools`. The repo override is a verbatim replacement, not an
 * intersection.
 */
export declare class ToolPermissionResolver {
    private config;
    private logger;
    constructor(config: EdgeWorkerConfig, logger: ILogger);
    /**
     * Update the internal config reference (e.g. after hot-reload).
     */
    setConfig(config: EdgeWorkerConfig): void;
    /**
     * Resolve a tool preset string to an array of tool names.
     */
    resolveToolPreset(preset: string | string[]): string[];
    /**
     * Build allowed tools for Slack chat sessions.
     *
     * Returns the team-configured `slackAllowedTools` if set, otherwise the
     * built-in `SLACK_DEFAULT_ALLOWED_TOOLS`. Additionally merges any
     * user-configured MCP tool entries the caller threads through (used by
     * `RunnerConfigBuilder` when a repo declares custom MCP server tools).
     *
     * @param mcpConfigKeys - Built-in MCP server names. Folded in as
     *   `mcp__<key>` prefixes only if not already present in the explicit
     *   list — the defaults already include the standard prefixes, so this
     *   is purely additive for non-standard servers.
     * @param userMcpTools - User-configured MCP tool entries from repository
     *   `allowedTools` (already `mcp__*` prefixed).
     */
    buildChatAllowedTools(mcpConfigKeys?: string[], userMcpTools?: string[]): string[];
    /**
     * Build allowed tools list for Linear-triggered sessions.
     *
     * Accepts a single repository or an array for multi-repo sessions. For
     * multiple repositories the result is the **union** of each repo's
     * resolved list (per-repo presets resolved first, then unioned). When no
     * repos are passed, falls back to the workspace `linearAllowedTools`
     * (or the Linear platform default when neither is set).
     */
    buildAllowedTools(repositories: RepositoryConfig | RepositoryConfig[], promptType?: PromptType): string[];
    /**
     * Build allowed tools list for GitHub-triggered sessions.
     *
     * GitHub `@mentions` target a single repository via a single PR, so this
     * does not perform multi-repo union — it expects exactly one repo. When
     * the workspace defines `githubAllowedTools` it is used as the global
     * default for resolution (in place of `linearAllowedTools`); otherwise
     * we fall back to `GITHUB_DEFAULT_ALLOWED_TOOLS`. Per-repository
     * `allowedTools` overrides still take precedence — same priority chain
     * as Linear, just with a different platform default at the bottom.
     */
    buildGithubAllowedTools(repository: RepositoryConfig, promptType?: PromptType): string[];
    /**
     * Resolve allowed tools for a single repository (Linear/GitHub priority
     * chain — chat sessions go through `buildChatAllowedTools`).
     */
    private buildAllowedToolsForRepo;
    /**
     * Build disallowed tools list from repository and global config.
     * Accepts a single repository or an array for multi-repo sessions.
     * For multiple repositories, the result is the intersection — a tool is only
     * disallowed if ALL repositories disallow it.
     */
    buildDisallowedTools(repositories: RepositoryConfig | RepositoryConfig[], promptType?: PromptType): string[];
    /**
     * Resolve disallowed tools for a single repository.
     */
    private buildDisallowedToolsForRepo;
}
//# sourceMappingURL=ToolPermissionResolver.d.ts.map