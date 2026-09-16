import type { HookCallbackMatcher, HookEvent } from "cyrus-claude-runner";
import type { ILogger } from "cyrus-core";
/**
 * Abstraction over the git/filesystem calls used by the hook so tests can
 * stub them without spawning real git processes.
 */
export interface IntentToAddGitClient {
    /** Returns true when `cwd` is inside a git working tree. */
    isGitRepo(cwd: string): boolean;
    /** Returns true when `path` exists on disk. */
    pathExists(path: string): boolean;
    /** Returns true when `path` matches a `.gitignore` rule relative to `cwd`. */
    isIgnored(cwd: string, path: string): boolean;
    /** Returns true when `path` is already tracked by git in `cwd`. */
    isTracked(cwd: string, path: string): boolean;
    /** Runs `git add --intent-to-add` for `path` in `cwd`. */
    intentToAdd(cwd: string, path: string): void;
}
/**
 * Production implementation backed by the local `git` binary and `fs`.
 * All operations are designed to fail silently — a missing/broken git
 * environment must not turn the hook into an error.
 */
export declare class DefaultIntentToAddGitClient implements IntentToAddGitClient {
    isGitRepo(cwd: string): boolean;
    pathExists(path: string): boolean;
    isIgnored(cwd: string, path: string): boolean;
    isTracked(cwd: string, path: string): boolean;
    intentToAdd(cwd: string, path: string): void;
}
/**
 * Extract the path argument from a Write/Edit/MultiEdit/NotebookEdit tool
 * input. Returns `undefined` when no string path is present — keeps the hook
 * a no-op for malformed or unexpected inputs.
 */
export declare function extractToolPath(toolInput: unknown): string | undefined;
/**
 * Apply `git add --intent-to-add` for `path` in `cwd` when, and only when,
 * all of the following hold:
 *   - `cwd` is a git repo
 *   - `path` exists on disk
 *   - `path` is not gitignored
 *   - `path` is not already tracked
 *
 * Any other state is a deliberate no-op. The function never throws.
 */
export declare function applyIntentToAdd(client: IntentToAddGitClient, cwd: string, path: string, log: ILogger): void;
/**
 * Build the PostToolUse hook that marks brand-new files created by
 * Write/Edit-style tools with `git add --intent-to-add`. Combined with the
 * Stop-hook guardrail's `--untracked-files=no`, this preserves the
 * "forgot-to-commit a new file" check while ignoring pre-existing untracked
 * files in the customer's worktree (which would otherwise wedge the agent).
 */
export declare function buildIntentToAddHook(log: ILogger, client?: IntentToAddGitClient): Partial<Record<HookEvent, HookCallbackMatcher[]>>;
//# sourceMappingURL=IntentToAddHook.d.ts.map