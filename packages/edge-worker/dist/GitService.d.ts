import type { BaseBranchResolution, Issue, RepoSetupHookEventHandler, RepositoryConfig, Workspace } from "cyrus-core";
import { type ILogger } from "cyrus-core";
export interface CreateGitWorktreeOptions {
    globalSetupScript?: string;
    /** Called for repository setup hook lifecycle events. Global setup hooks do not emit events. */
    onRepoSetupHookEvent?: RepoSetupHookEventHandler;
    /**
     * Override workspace base directory. Required for 0-repo workspaces.
     * For 1+ repos, defaults to the first repository's workspaceBaseDir.
     */
    workspaceBaseDir?: string;
    /**
     * Per-repo base branch overrides from [repo=name#branch] syntax.
     * Takes highest priority over graphite, parent, and default base branches.
     */
    baseBranchOverrides?: Map<string, string>;
}
export interface GitServiceOptions {
    cyrusHome?: string;
}
export interface DeleteWorktreeOptions {
    /**
     * Repositories involved with this issue's workspace. When provided, each
     * repo's `cyrus-teardown.sh` (if present) is invoked before worktree removal,
     * with `cwd` set to that repo's worktree subdirectory.
     *
     * In the single-repo layout, the worktree subdirectory is the workspace root.
     * In multi-repo layouts, it is `<workspace>/<repository.name>/`.
     */
    repositories?: RepositoryConfig[];
}
/**
 * Service responsible for Git worktree operations
 */
export declare class GitService {
    private logger;
    private worktreeIncludeService;
    private cyrusHome;
    constructor(options?: GitServiceOptions, logger?: ILogger);
    /**
     * Check if a branch exists locally or remotely
     */
    branchExists(branchName: string, repoPath: string): Promise<boolean>;
    /**
     * Sanitize branch name by removing characters invalid in git refs.
     * Git branch names cannot contain: space, ~, ^, :, ?, *, [, \, backtick,
     * consecutive dots (..), ASCII control chars, or start/end with dot or slash.
     * See `git check-ref-format` for the full specification.
     */
    sanitizeBranchName(name: string): string;
    /**
     * Resolve mutable Git metadata directories for a repository/worktree.
     * This includes linked worktree metadata paths (for example
     * `.git/worktrees/<name>/FETCH_HEAD`) that must be writable by sandboxes.
     */
    getGitMetadataDirectories(workingDirectory: string): string[];
    /**
     * Resolve mutable Git metadata directories for an entire workspace,
     * including every repository in a multi-repo session.
     *
     * For single-repo workspaces `workspace.path` is itself the worktree, so
     * resolving from it is sufficient. For multi-repo workspaces, however,
     * `workspace.path` is a plain parent container (not a git repo) and each
     * repository lives in a sub-worktree under `workspace.repoPaths`. Each of
     * those sub-worktrees has its own linked git metadata (for example
     * `<mainRepo>/.git/worktrees/<name>/`) that must be writable by sandboxes —
     * resolving only from the container would miss them entirely, breaking
     * `git add`/`git merge`/etc. with "Operation not permitted".
     */
    getGitMetadataDirectoriesForWorkspace(workspace: Workspace): string[];
    /**
     * Find an existing worktree by its checked-out branch name.
     * Parses `git worktree list --porcelain` output and returns the worktree path
     * if a worktree is found with the given branch checked out, or null otherwise.
     */
    findWorktreeByBranch(branchName: string, repoPath: string): string | null;
    /**
     * Determine the base branch for an issue with full resolution info.
     *
     * Priority order:
     * 0. Explicit override from [repo=name#branch] syntax
     * 1. Graphite blocked-by relationship
     * 2. Parent issue branch
     * 3. Repository default base branch
     *
     * @param baseBranchOverride Optional override from [repo=name#branch] syntax (highest priority)
     */
    determineBaseBranch(issue: Issue, repository: RepositoryConfig, baseBranchOverride?: string): Promise<BaseBranchResolution>;
    /**
     * Check if an issue has the graphite label
     */
    hasGraphiteLabel(issue: Issue, repository: RepositoryConfig): Promise<boolean>;
    /**
     * Fetch issues that block this issue (i.e., issues this one is "blocked by").
     * Uses the inverseRelations field with type "blocks".
     */
    fetchBlockingIssues(issue: Issue): Promise<Issue[]>;
    /**
     * Fetch label names for an issue
     */
    fetchIssueLabels(issue: Issue): Promise<string[]>;
    /**
     * Create a workspace for an issue with 0, 1, or N repositories.
     *
     * - **0 repos**: Creates a plain folder at `workspaceBaseDir/ISSUE-ID/` (no git worktree)
     * - **1 repo**: Git worktree directly at `repo.workspaceBaseDir/ISSUE-ID/` (preserves current behavior)
     * - **N repos**: Parent folder at `workspaceBaseDir/ISSUE-ID/` with per-repo worktree subdirs
     */
    createGitWorktree(issue: Issue, repositories: RepositoryConfig[], options?: CreateGitWorktreeOptions): Promise<Workspace>;
    /**
     * Create a single git worktree for one repository.
     * This is the core worktree creation logic, used by createGitWorktree for both
     * single-repo and multi-repo cases.
     *
     * @param workspacePathOverride - Override the workspace path (used for N-repo subdirectories)
     */
    private createSingleRepoWorktree;
    /**
     * Delete worktrees for a given issue identifier.
     *
     * Removes all git worktrees under the workspace directory for the issue,
     * handling both single-repo and multi-repo layouts since the issue identifier
     * directory is the root in both cases.
     *
     * If `options.repositories` is supplied, each repo's per-repo
     * `cyrus-teardown.sh` (if present in its repo root) is invoked **before**
     * the worktrees are removed, with `cwd` set to that repo's worktree
     * subdirectory. A failure in one repo's teardown does not block the others
     * or the final `rmSync`.
     *
     * @param issueIdentifier - The issue identifier (e.g., "DEF-123")
     * @param options - Optional teardown wiring (see {@link DeleteWorktreeOptions})
     */
    deleteWorktree(issueIdentifier: string, options?: DeleteWorktreeOptions): Promise<void>;
    /**
     * Run per-repo teardown scripts for each repository whose worktree is about
     * to be removed. Prefers the explicit `repositories` list passed by the
     * caller (source-of-truth from the session manager); falls back to inferring
     * the repo mapping from `worktreePaths` (filesystem-driven) — i.e. matches
     * each worktree subdirectory to a configured `RepositoryConfig` by
     * `repository.repositoryPath`.
     *
     * Each repo's teardown runs with `cwd` set to its own worktree subdirectory.
     * Failures are isolated: one repo failing does not skip subsequent repos
     * and does not block worktree deletion.
     */
    private runTeardownsForIssue;
    /**
     * Find all git worktree paths that are located under a given directory.
     * Checks the directory itself and its immediate subdirectories (for multi-repo layouts).
     */
    private findWorktreesUnderPath;
    /**
     * Check if a directory is a git worktree (has a .git file, not a .git directory).
     */
    private isGitWorktree;
    /**
     * Extract the main repository path from a worktree's .git file.
     * Worktree .git files contain "gitdir: /path/to/main-repo/.git/worktrees/<name>".
     * Returns the main repository directory, or null if it cannot be determined.
     */
    private getMainRepoFromWorktree;
    /**
     * Find and run a repository-specific setup script (cyrus-setup.sh/.ps1/.cmd/.bat)
     */
    private runRepoSetupScript;
    /**
     * Find and run a repository-specific teardown script (cyrus-teardown.sh/.ps1/.cmd/.bat).
     *
     * Mirrors {@link runRepoSetupScript} but is invoked from {@link deleteWorktree}
     * immediately before the worktree subdirectory is removed. Only
     * `LINEAR_ISSUE_IDENTIFIER` is guaranteed in the teardown environment because
     * the terminal-state message bus path does not carry the full Issue object.
     */
    private runRepoTeardownScript;
    /**
     * Shared discovery+dispatch for repo-scoped hook scripts (setup and teardown).
     * Looks in `workspacePath` for `cyrus-<hook>.{sh,ps1,cmd,bat}` and runs the
     * first compatible variant with `cwd` set to `workspacePath`.
     */
    private runRepoHookScript;
    private emitRepoSetupHookEvent;
    /**
     * Run a hook script (setup or teardown) with proper error handling and logging.
     * Failure is non-blocking — errors are logged and execution continues.
     */
    private runHookScript;
    private runHookScriptInherited;
    /**
     * Find and run a global setup script (path resolved from EdgeConfig).
     * Kept as a thin wrapper to preserve the existing call sites.
     */
    private runSetupScript;
}
//# sourceMappingURL=GitService.d.ts.map