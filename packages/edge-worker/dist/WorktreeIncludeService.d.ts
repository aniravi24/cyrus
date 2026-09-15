import { type ILogger } from "cyrus-core";
/**
 * Service responsible for handling .worktreeinclude file processing
 *
 * The .worktreeinclude file specifies which files ignored by .gitignore
 * should be copied from the main repository to new worktrees.
 *
 * Files must match BOTH .worktreeinclude AND .gitignore patterns to be copied.
 * This ensures only intended ignored files are duplicated.
 */
export declare class WorktreeIncludeService {
    private logger;
    constructor(logger?: ILogger);
    /**
     * Process .worktreeinclude and copy matching ignored files to the worktree
     *
     * @param repositoryPath - Path to the main repository
     * @param worktreePath - Path to the newly created worktree
     */
    copyIgnoredFiles(repositoryPath: string, worktreePath: string): Promise<void>;
    /**
     * Parse a pattern file (like .gitignore or .worktreeinclude)
     * Returns an array of non-empty, non-comment lines
     */
    private parsePatternFile;
    /**
     * Recursively find all files in the repository that match both
     * .worktreeinclude AND .gitignore patterns
     */
    private findMatchingFiles;
}
//# sourceMappingURL=WorktreeIncludeService.d.ts.map