import type { SandboxMode } from "@openai/codex-sdk";
import type { ResolvedCodexSandbox } from "../backend/types.js";
/** Stable id for the per-thread permission profile Cyrus builds. */
export declare const CYRUS_SANDBOX_PROFILE_ID = "cyrus-sandbox";
/**
 * Cyrus filesystem sandbox intent (subset of the agent SDK `SandboxSettings`).
 * Paths are expected absolute by the time they reach here (the EdgeWorker layer
 * resolves `~`/`.`/relative entries before plumbing them in).
 *
 * Reads are an allow-list: a path is readable only if it is the worktree
 * (`:workspace_roots`), a platform default (`:minimal`), or appears in
 * `allowRead`/`allowWrite`. Anything else (e.g. the home directory) is denied.
 * `denyRead` is honored by omission — a denied path simply never appears in the
 * allow-list. Sub-path denies inside an allowed root are not expressible (and
 * not needed by Cyrus's deny-broad / allow-narrow posture).
 */
export interface CyrusSandboxFilesystem {
    allowRead?: string[];
    allowWrite?: string[];
    denyRead?: string[];
}
export interface SandboxResolveInput {
    /** Coarse Codex sandbox mode (defaults to workspace-write upstream). */
    mode: SandboxMode;
    /** Session working directory (the worktree; maps to `:workspace_roots`). */
    workingDirectory?: string;
    /** Extra writable roots (e.g. multi-repo sub-worktrees), already absolute. */
    writableRoots: string[];
    networkAccess: boolean;
    /** When present, produces a granular `profile`; otherwise a `workspace-mode`. */
    sandboxSettings?: CyrusSandboxFilesystem;
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
export declare function resolveCodexSandbox(input: SandboxResolveInput): ResolvedCodexSandbox;
//# sourceMappingURL=sandboxPolicy.d.ts.map