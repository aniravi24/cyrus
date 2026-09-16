import { type ApiResponse } from "../types.js";
/**
 * Install the per-invocation gh token resolver to
 * `<cyrusHome>/scripts/gh-cyrus.cjs`. The droplet's `~/.local/bin/gh`
 * wrapper execs into it so each gh command authenticates with the
 * installation token for the org it targets (explicit -R/--repo arg, else
 * the cwd's origin remote) — required for multi-repo sessions that span
 * GitHub orgs. Idempotent.
 */
export declare function ensureGhTokenResolver(cyrusHome: string): string;
/**
 * Install the Cyrus git credential helper and wire it into the global git
 * config for github.com. Idempotent — safe to run on every token push and
 * on EdgeWorker startup.
 *
 * - Copies the self-contained helper script to
 *   `<cyrusHome>/scripts/git-credential-cyrus.cjs` (executable).
 * - Enables `credential."https://github.com".useHttpPath` so git passes the
 *   repo path (and thus the org) to the helper.
 * - Replaces any inherited helpers for github.com (e.g. gh's keyring helper)
 *   with an empty entry followed by the Cyrus helper. Helper values must be
 *   prefixed with `!` to invoke an arbitrary command — without it git would
 *   look for a `git credential-<name>` binary.
 *
 * Returns the absolute path of the installed helper script.
 */
export declare function ensureGitHubCredentialHelper(cyrusHome: string): string;
/**
 * Self-heal the droplet's `~/.local/bin/gh` wrapper to exec the Cyrus gh
 * token resolver.
 *
 * Droplet images bake a gh wrapper that strips injected GH_TOKEN /
 * GITHUB_TOKEN env vars. The current design routes gh through
 * `<cyrusHome>/scripts/gh-cyrus.cjs`, which resolves the installation
 * token PER INVOCATION for the org the command targets (multi-repo
 * sessions span orgs, so a session-wide token is not enough). Droplets
 * provisioned from older images keep their baked wrapper until rebuilt;
 * since the wrapper lives in the cyrus user's home, rewrite it here on
 * token pushes — making per-org gh independent of the image rollout.
 * No-op when no wrapper exists (self-host), it already execs the
 * resolver, or it has an unrecognized shape.
 */
export declare function ensureGhWrapperSupportsCyrusToken(homeDir?: string): boolean;
/**
 * Authenticate the `gh` CLI with a pushed installation token.
 *
 * The droplet-local token refresh service used to run `gh auth login` every
 * 20 minutes; with refresh moved to cyrus-hosted, this keeps bare `gh`
 * usage (outside sessions, and sessions on droplet images whose gh wrapper
 * strips GH_TOKEN) authenticated. Multi-org correctness comes from the
 * per-session GH_TOKEN env var; this default uses the first token, which is
 * exact for single-installation teams. Refreshed on every token push.
 *
 * Non-fatal by design — self-host machines may not have `gh` installed.
 */
export declare function configureGhCliAuth(token: string): void;
/**
 * Handle a GitHub installation tokens push from cyrus-hosted.
 *
 * Persists the per-installation tokens to `<cyrusHome>/github-tokens.json`
 * (atomically, mode 0600), ensures the git credential helper is installed
 * so concurrent git operations against different GitHub orgs each
 * authenticate with the right token, and refreshes the `gh` CLI's stored
 * auth with the first pushed token.
 *
 * @param rawPayload - Unvalidated payload from the request
 * @param cyrusHome - Path to the Cyrus home directory
 */
export declare function handleGitHubTokens(rawPayload: unknown, cyrusHome: string): Promise<ApiResponse>;
//# sourceMappingURL=githubTokens.d.ts.map