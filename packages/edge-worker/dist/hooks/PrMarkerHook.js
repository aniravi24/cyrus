import { execFileSync, spawnSync } from "node:child_process";
/**
 * The hidden HTML marker that identifies a PR/MR description as Cyrus-authored.
 * Its presence is what tells our GitHub/GitLab webhook handlers that a
 * "Changes requested" or comment event should be forwarded back to Cyrus.
 */
export const CYRUS_PR_MARKER = "<!-- generated-by-cyrus -->";
/**
 * Append the marker to a body, preserving a single trailing newline.
 * Idempotent: returns the original body when the marker is already present.
 */
export function appendMarker(body) {
    const current = body ?? "";
    if (current.includes(CYRUS_PR_MARKER)) {
        return current;
    }
    const trimmed = current.replace(/\s+$/, "");
    if (trimmed.length === 0) {
        return CYRUS_PR_MARKER;
    }
    return `${trimmed}\n\n${CYRUS_PR_MARKER}`;
}
/**
 * GitHub provider — uses the `gh` CLI. Also covers `gt submit` (Graphite),
 * which submits via the GitHub API and ends up viewable through `gh pr view`.
 */
export class GitHubPrMarkerProvider {
    name = "github";
    matches(command) {
        // Strip surrounding shell noise; we only care whether the command line
        // contains a PR-mutating gh/gt invocation.
        return (/\bgh\s+pr\s+(create|edit)\b/.test(command) ||
            /\bgt\s+submit\b/.test(command));
    }
    ensureMarker(cwd, log) {
        let payload;
        try {
            const json = execFileSync("gh", ["pr", "view", "--json", "body,number"], {
                cwd,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            });
            payload = JSON.parse(json);
        }
        catch {
            // No PR for this branch yet, gh not authenticated, or not a GitHub
            // repo. Either way, nothing for us to ensure — bail silently.
            return;
        }
        if (typeof payload.number !== "number") {
            return;
        }
        const updated = appendMarker(payload.body);
        if (updated === (payload.body ?? "")) {
            return;
        }
        const result = spawnSync("gh", ["pr", "edit", String(payload.number), "--body-file", "-"], {
            cwd,
            input: updated,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        if (result.status !== 0) {
            log.warn(`[PrMarkerHook] gh pr edit failed for #${payload.number}: ${result.stderr?.trim() || "unknown error"}`);
            return;
        }
        log.info(`[PrMarkerHook] Appended Cyrus marker to GitHub PR #${payload.number}`);
    }
}
/**
 * GitLab provider — uses the `glab` CLI.
 */
export class GitLabMrMarkerProvider {
    name = "gitlab";
    matches(command) {
        return /\bglab\s+mr\s+(create|update|edit)\b/.test(command);
    }
    ensureMarker(cwd, log) {
        let payload;
        try {
            const json = execFileSync("glab", ["mr", "view", "--output", "json"], {
                cwd,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            });
            payload = JSON.parse(json);
        }
        catch {
            return;
        }
        if (typeof payload.iid !== "number") {
            return;
        }
        const updated = appendMarker(payload.description);
        if (updated === (payload.description ?? "")) {
            return;
        }
        const result = spawnSync("glab", ["mr", "update", String(payload.iid), "--description", updated], {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        });
        if (result.status !== 0) {
            log.warn(`[PrMarkerHook] glab mr update failed for !${payload.iid}: ${result.stderr?.trim() || "unknown error"}`);
            return;
        }
        log.info(`[PrMarkerHook] Appended Cyrus marker to GitLab MR !${payload.iid}`);
    }
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
export function buildPrMarkerHook(log, providers = [
    new GitHubPrMarkerProvider(),
    new GitLabMrMarkerProvider(),
]) {
    return {
        PostToolUse: [
            {
                matcher: "Bash",
                hooks: [
                    async (input) => {
                        const post = input;
                        const command = post.tool_input?.command ??
                            "";
                        const provider = providers.find((p) => p.matches(command));
                        if (!provider) {
                            return {};
                        }
                        try {
                            provider.ensureMarker(post.cwd, log);
                        }
                        catch (err) {
                            log.warn(`[PrMarkerHook] ${provider.name} provider threw: ${err.message}`);
                        }
                        return {};
                    },
                ],
            },
        ],
    };
}
//# sourceMappingURL=PrMarkerHook.js.map