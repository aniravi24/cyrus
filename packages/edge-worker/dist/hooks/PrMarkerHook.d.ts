import type { HookCallbackMatcher, HookEvent } from "cyrus-claude-runner";
import type { ILogger } from "cyrus-core";
/**
 * The hidden HTML marker that identifies a PR/MR description as Cyrus-authored.
 * Its presence is what tells our GitHub/GitLab webhook handlers that a
 * "Changes requested" or comment event should be forwarded back to Cyrus.
 */
export declare const CYRUS_PR_MARKER = "<!-- generated-by-cyrus -->";
/**
 * Provider-specific knowledge about how to detect PR/MR mutating commands and
 * how to read/write the description on the underlying forge. Adding support
 * for a new forge means adding a new provider — no changes to the hook itself.
 */
export interface PrMarkerProvider {
    /** Provider name, used only for log messages. */
    readonly name: string;
    /** Returns true when `command` will create or update a PR/MR via this provider. */
    matches(command: string): boolean;
    /**
     * Idempotently ensures the marker is present at the end of the live PR/MR
     * description for the branch checked out at `cwd`. Implementations should
     * be a no-op when no PR/MR exists yet, or when the marker is already there.
     */
    ensureMarker(cwd: string, log: ILogger): void;
}
/**
 * Append the marker to a body, preserving a single trailing newline.
 * Idempotent: returns the original body when the marker is already present.
 */
export declare function appendMarker(body: string | null | undefined): string;
/**
 * GitHub provider — uses the `gh` CLI. Also covers `gt submit` (Graphite),
 * which submits via the GitHub API and ends up viewable through `gh pr view`.
 */
export declare class GitHubPrMarkerProvider implements PrMarkerProvider {
    readonly name = "github";
    matches(command: string): boolean;
    ensureMarker(cwd: string, log: ILogger): void;
}
/**
 * GitLab provider — uses the `glab` CLI.
 */
export declare class GitLabMrMarkerProvider implements PrMarkerProvider {
    readonly name = "gitlab";
    matches(command: string): boolean;
    ensureMarker(cwd: string, log: ILogger): void;
}
/**
 * Build the PostToolUse hook that ensures Cyrus's identifying marker is
 * present on every PR/MR Cyrus creates or updates.
 *
 * Wired alongside the screenshot/stop hooks in RunnerConfigBuilder. Designed
 * around the strategy pattern: `providers` is injectable so tests can stub
 * forge interactions and so new forges can be added without touching this
 * function.
 */
export declare function buildPrMarkerHook(log: ILogger, providers?: PrMarkerProvider[]): Partial<Record<HookEvent, HookCallbackMatcher[]>>;
//# sourceMappingURL=PrMarkerHook.d.ts.map