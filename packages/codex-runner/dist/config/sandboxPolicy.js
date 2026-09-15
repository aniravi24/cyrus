import { isAbsolute } from "node:path";
/** Stable id for the per-thread permission profile Cyrus builds. */
export const CYRUS_SANDBOX_PROFILE_ID = "cyrus-sandbox";
function uniqueAbsolute(paths) {
    return [...new Set(paths.filter((p) => p && isAbsolute(p)))];
}
/**
 * Resolve the per-thread sandbox decision.
 *
 * - No `sandboxSettings` → `workspace-mode` (the coarse Codex mode with broad
 *   reads — unchanged default behavior).
 * - `sandboxSettings` present → a granular permission `profile` that restricts
 *   reads to an allow-list (worktree + platform defaults + explicit reads) and
 *   writes to the worktree + explicit writable roots.
 */
export function resolveCodexSandbox(input) {
    const { mode, workingDirectory, writableRoots, networkAccess } = input;
    if (!input.sandboxSettings) {
        return {
            kind: "workspace-mode",
            mode,
            writableRoots: uniqueAbsolute([
                ...(workingDirectory ? [workingDirectory] : []),
                ...writableRoots,
            ]),
            networkAccess,
        };
    }
    const { allowRead = [], allowWrite = [] } = input.sandboxSettings;
    const cwd = workingDirectory;
    // Extra writable roots beyond the worktree (cwd is covered by :workspace_roots).
    const writableAbs = uniqueAbsolute([...writableRoots, ...allowWrite]).filter((p) => p !== cwd);
    // Readable-only roots: explicit reads not already writable / the worktree.
    const readableAbs = uniqueAbsolute(allowRead).filter((p) => p !== cwd && !writableAbs.includes(p));
    // Danger-full-access keeps broad access; read-only forbids writes; the
    // default (workspace-write) makes the worktree writable.
    const dangerFull = mode === "danger-full-access";
    const workspaceAccess = mode === "read-only" ? "read" : "write";
    const filesystem = dangerFull
        ? { ":root": "write" }
        : {
            ":minimal": "read",
            ":workspace_roots": workspaceAccess,
            ":tmpdir": "write",
            ":slash_tmp": "write",
            ...Object.fromEntries(writableAbs.map((p) => [p, "write"])),
            ...Object.fromEntries(readableAbs.map((p) => [p, "read"])),
        };
    return {
        kind: "profile",
        profileId: CYRUS_SANDBOX_PROFILE_ID,
        filesystem,
        networkAccess,
    };
}
//# sourceMappingURL=sandboxPolicy.js.map