import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
/**
 * Tool names whose successful invocation may have produced a brand-new file
 * that the agent intends to ship. Marking that file with
 * `git add --intent-to-add` ensures the Stop-hook guardrail (which uses
 * `git status --untracked-files=no`) still flags the file as unshipped if
 * the agent forgets to commit it before ending the session.
 */
const FILE_WRITING_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];
/**
 * Production implementation backed by the local `git` binary and `fs`.
 * All operations are designed to fail silently — a missing/broken git
 * environment must not turn the hook into an error.
 */
export class DefaultIntentToAddGitClient {
    isGitRepo(cwd) {
        try {
            execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
                cwd,
                stdio: ["ignore", "ignore", "ignore"],
            });
            return true;
        }
        catch {
            return false;
        }
    }
    pathExists(path) {
        try {
            return existsSync(path);
        }
        catch {
            return false;
        }
    }
    isIgnored(cwd, path) {
        try {
            execFileSync("git", ["check-ignore", "-q", "--", path], {
                cwd,
                stdio: ["ignore", "ignore", "ignore"],
            });
            return true;
        }
        catch {
            return false;
        }
    }
    isTracked(cwd, path) {
        try {
            execFileSync("git", ["ls-files", "--error-unmatch", "--", path], {
                cwd,
                stdio: ["ignore", "ignore", "ignore"],
            });
            return true;
        }
        catch {
            return false;
        }
    }
    intentToAdd(cwd, path) {
        execFileSync("git", ["add", "--intent-to-add", "--", path], {
            cwd,
            stdio: ["ignore", "ignore", "ignore"],
        });
    }
}
/**
 * Extract the path argument from a Write/Edit/MultiEdit/NotebookEdit tool
 * input. Returns `undefined` when no string path is present — keeps the hook
 * a no-op for malformed or unexpected inputs.
 */
export function extractToolPath(toolInput) {
    if (!toolInput || typeof toolInput !== "object") {
        return undefined;
    }
    const record = toolInput;
    for (const key of ["file_path", "notebook_path", "path"]) {
        const value = record[key];
        if (typeof value === "string" && value.length > 0) {
            return value;
        }
    }
    return undefined;
}
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
export function applyIntentToAdd(client, cwd, path, log) {
    if (!client.isGitRepo(cwd)) {
        return;
    }
    if (!client.pathExists(path)) {
        return;
    }
    if (client.isIgnored(cwd, path)) {
        return;
    }
    if (client.isTracked(cwd, path)) {
        return;
    }
    try {
        client.intentToAdd(cwd, path);
        log.debug(`[IntentToAddHook] marked ${path} as intent-to-add`);
    }
    catch (err) {
        log.debug(`[IntentToAddHook] git add -N failed for ${path}: ${err.message}`);
    }
}
/**
 * Build the PostToolUse hook that marks brand-new files created by
 * Write/Edit-style tools with `git add --intent-to-add`. Combined with the
 * Stop-hook guardrail's `--untracked-files=no`, this preserves the
 * "forgot-to-commit a new file" check while ignoring pre-existing untracked
 * files in the customer's worktree (which would otherwise wedge the agent).
 */
export function buildIntentToAddHook(log, client = new DefaultIntentToAddGitClient()) {
    const matcher = `^(${FILE_WRITING_TOOLS.join("|")})$`;
    return {
        PostToolUse: [
            {
                matcher,
                hooks: [
                    async (input) => {
                        const post = input;
                        const filePath = extractToolPath(post.tool_input);
                        if (!filePath) {
                            return {};
                        }
                        try {
                            applyIntentToAdd(client, post.cwd, filePath, log);
                        }
                        catch (err) {
                            log.debug(`[IntentToAddHook] threw: ${err.message}`);
                        }
                        return {};
                    },
                ],
            },
        ],
    };
}
//# sourceMappingURL=IntentToAddHook.js.map