import type { SdkPluginConfig } from "cyrus-claude-runner";
import type { ILogger } from "cyrus-core";
/**
 * Session context used to evaluate per-skill scope restrictions. Each dimension
 * is optional — when omitted, scopes that depend on that dimension cannot match
 * (e.g. a session with no `linearTeamId` will not see skills scoped to a team).
 */
export interface SkillSessionContext {
    repositoryId?: string;
    linearTeamId?: string;
    linearLabelIds?: string[];
    /**
     * Working-tree paths of the repositories participating in this session.
     * Each repo's `<repoPath>/.claude/skills/*` directory names are unioned into
     * the resolved skill whitelist so a repo can ship its own skills. Carries one
     * path for single-repo / GitHub-mention sessions and every participating
     * worktree for multi-repo sessions.
     */
    repoPaths?: string[];
}
/**
 * Resolves skills plugins for agent sessions.
 *
 * Two plugin sources are supported:
 * 1. Internal plugin — default Cyrus workflow skills deployed to ~/.cyrus/cyrus-skills-plugin/
 *    (editable by the user)
 * 2. User skills plugin — custom skills managed by the CYHOST UI at ~/.cyrus/user-skills-plugin/
 *
 * Both live outside the repository so they are never committed to the user's repo.
 *
 * Plugin ordering: user plugin is loaded before internal plugin so that
 * user-defined skills take precedence over internal skills with the same name.
 */
export declare class SkillsPluginResolver {
    private readonly cyrusHome;
    private readonly logger;
    private readonly internalPluginPath;
    private readonly userPluginPath;
    private readonly userSkillsDir;
    constructor(cyrusHome: string, logger: ILogger);
    /**
     * Ensure the user-skills plugin layout exists on disk.
     *
     * Called from EdgeWorker startup — idempotent check-and-create so the
     * plugin is always ready before the first skill is synced, mirroring the
     * pattern used for other Cyrus-managed directories (repos, worktrees,
     * mcp-configs in `Application.ensureRequiredDirectories()`).
     *
     * Creates, if missing:
     *   ~/.cyrus/user-skills-plugin/
     *   ~/.cyrus/user-skills-plugin/skills/
     *   ~/.cyrus/user-skills-plugin/.claude-plugin/plugin.json
     *
     * The manifest file is what the Claude Agent SDK uses to identify the
     * directory as a plugin — without it, even a populated `skills/` tree is
     * silently ignored by the SDK's plugin loader.
     *
     * Separated from resolve() to maintain Command-Query Separation:
     * this method writes to the filesystem, resolve() only reads.
     */
    ensureUserPluginScaffolded(): Promise<void>;
    /**
     * Resolve all available skills plugins (user + internal).
     *
     * User plugin is listed first so user-defined skills take precedence
     * over internal skills with the same name.
     *
     * Pure query — no filesystem side effects.
     */
    resolve(): Promise<SdkPluginConfig[]>;
    /**
     * Discover all available skill names from the given plugin configs,
     * optionally filtered by per-skill scope sidecars (scope.json) using the
     * provided session context.
     *
     * Reads the `skills/` subdirectory of each plugin path and returns
     * deduplicated skill names (user skills shadow internal ones due to
     * insertion order of the Set).
     *
     * Filtering rules:
     * - A skill with no `scope.json` (or an empty scope) is always available.
     * - A skill with a populated scope is available only when every populated
     *   dimension matches the session context (AND across dimensions, OR
     *   within each list).
     * - When `context` is omitted, no filtering is applied (all skills returned).
     *
     * Repo-local skills: when `context.repoPaths` is provided, each
     * `<repoPath>/.claude/skills/*` directory name is also unioned in. These are
     * implicitly scoped to the repository by virtue of living in it, so the
     * `scope.json` filter is NOT applied to them. They are appended after the
     * plugin skills, so a plugin skill of the same name takes precedence in the
     * (display-order-sensitive) dedup.
     */
    discoverSkillNames(plugins: SdkPluginConfig[], context?: SkillSessionContext): Promise<string[]>;
    /**
     * Read the immediate subdirectory (and symlink) names of a `skills/`
     * directory. Returns an empty array when the directory is missing or
     * unreadable, so callers can treat "no skills dir" as a no-op.
     */
    private readSkillDirEntries;
    /**
     * Read a skill's `scope.json` sidecar if present. Returns `null` when the
     * sidecar is absent, empty, or unparseable — all of which mean "no scope
     * restriction" (global skill).
     */
    private loadSkillScope;
    /**
     * Evaluate scope against session context.
     *
     * A null/empty scope always matches. Otherwise every populated dimension
     * on the scope must be satisfied by the session context (AND), where each
     * dimension is satisfied when the context value is included in the
     * configured list (OR within the dimension).
     */
    private scopeMatches;
    /**
     * Build the skills guidance block appended to system prompts.
     *
     * Dynamically lists all available skills so that user-added custom
     * skills appear in the guidance without code changes (OCP).
     *
     * Accepts pre-resolved plugins to avoid redundant filesystem access
     * when resolve() is also called separately for the runner config.
     */
    buildSkillsGuidance(plugins?: SdkPluginConfig[], context?: SkillSessionContext): Promise<string>;
    private resolveInternalPlugin;
    private resolveUserPlugin;
    /**
     * Detect and log skill name conflicts between user and internal plugins.
     */
    private logConflicts;
    private exists;
}
//# sourceMappingURL=SkillsPluginResolver.d.ts.map