import type { Issue, RepositoryConfig, Workspace } from "cyrus-core";
/**
 * Logger interface for GitService
 * Allows consumers to provide their own logging implementation
 */
export interface GitServiceLogger {
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
/**
 * Service responsible for Git worktree operations
 */
export declare class GitService {
    private logger;
    private worktreeIncludeService;
    constructor(logger?: GitServiceLogger);
    /**
     * Check if a branch exists locally or remotely
     */
    branchExists(branchName: string, repoPath: string): Promise<boolean>;
    /**
     * Sanitize branch name by removing backticks to prevent command injection
     */
    sanitizeBranchName(name: string): string;
    /**
     * Run a setup script with proper error handling and logging
     */
    private runSetupScript;
    /**
     * Create a git worktree for an issue
     */
    createGitWorktree(issue: Issue, repository: RepositoryConfig, globalSetupScript?: string): Promise<Workspace>;
}
//# sourceMappingURL=GitService.d.ts.map