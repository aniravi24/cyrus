/**
 * Build disallowed Read patterns for everything in the user's home directory
 * that is not on the path to the cwd or any of the additional allowed paths.
 *
 * For each ancestor directory, we enumerate its children and deny Read access
 * to any that are not ancestors of, or equal to, one of the allowed paths.
 * This prevents Claude from reading sensitive home directory files (SSH keys,
 * AWS credentials, git config, etc.) while still allowing access to the
 * worktree, the attachments directory, repository base paths, and any other
 * directories Claude legitimately needs to read.
 *
 * Example: cwd = /Users/alice/.cyrus/worktrees/ENG-1/repo
 *          additionalAllowedPaths = [/Users/alice/.cyrus/ENG-1/attachments]
 * Allows:  ~/.cyrus/worktrees/ENG-1/repo  (cwd)
 *          ~/.cyrus/ENG-1/attachments      (additional allowed path)
 * Denies:  ~/.ssh/**, ~/.aws/**, ~/.gitconfig, ~/Documents/**, etc.
 *          and siblings at each intermediate level that lead nowhere useful.
 *
 * Claude Code requires an extra leading / for absolute paths in tool patterns.
 * See: https://docs.anthropic.com/en/docs/claude-code/settings#read-edit
 */
export declare function buildHomeDirectoryDisallowedTools(cwd: string, additionalAllowedPaths?: string[]): string[];
//# sourceMappingURL=home-directory-restrictions.d.ts.map