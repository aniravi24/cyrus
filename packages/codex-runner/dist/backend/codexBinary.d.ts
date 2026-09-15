/** How to launch a `codex app-server` process: a command + its full argv. */
export interface CodexAppServerLaunch {
    command: string;
    args: string[];
}
/**
 * Resolve how to launch `codex app-server`.
 *
 * The `@openai/codex-sdk` only exposes the high-level `Codex`/`Thread` API (no
 * app-server transport, no `turn/steer`), and no getter for its bundled binary,
 * so we drive the CLI ourselves. Rather than re-derive the platform→vendor
 * binary path (a fragile coupling to the SDK's internal layout), we invoke the
 * `@openai/codex` package's **public** `bin` launcher (`bin/codex.js`) via Node:
 * that launcher owns the platform-package/vendor resolution and forwards stdio
 * + termination signals to the native binary. We read its location from the
 * package's own `package.json` `bin` entry, so a future vendor-layout change
 * upstream costs us nothing.
 *
 * @param override Explicit Codex binary path (from config). When set, that
 * binary is launched directly (no Node launcher) — mirrors the SDK's
 * `codexPathOverride`.
 */
export declare function resolveCodexAppServerLaunch(override?: string): CodexAppServerLaunch;
//# sourceMappingURL=codexBinary.d.ts.map