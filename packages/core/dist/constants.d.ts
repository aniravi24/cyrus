/**
 * Shared constants used across Cyrus packages
 */
/**
 * Default proxy URL for Cyrus hosted services
 */
export declare const DEFAULT_PROXY_URL = "https://cyrus-proxy.ceedar.workers.dev";
/**
 * Default directory name for git worktrees
 */
export declare const DEFAULT_WORKTREES_DIR = "worktrees";
/**
 * Default directory name for cloned repositories
 */
export declare const DEFAULT_REPOS_DIR = "repos";
/**
 * Resolves the repos directory, preferring CYRUS_REPOS_DIR env var over the default.
 */
export declare function getDefaultReposDir(cyrusHome: string): string;
/**
 * Resolves the worktrees directory, preferring CYRUS_WORKTREES_DIR env var over the default.
 */
export declare function getDefaultWorktreesDir(cyrusHome: string): string;
/**
 * Default base branch for new repositories
 */
export declare const DEFAULT_BASE_BRANCH = "main";
/**
 * Default config filename
 */
export declare const DEFAULT_CONFIG_FILENAME = "config.json";
//# sourceMappingURL=constants.d.ts.map