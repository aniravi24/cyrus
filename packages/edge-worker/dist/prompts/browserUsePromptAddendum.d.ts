/**
 * Optional system-prompt addendum that tells the agent it has access to the
 * `agent-browser` CLI (Playwright-backed) and a local Chromium for taking
 * screenshots and driving real browsers.
 *
 * Only injected when the environment variable `CYRUS_BROWSER_USE_ENABLED` is
 * set to a truthy value. cyrus-hosted sets this on cloud-runtime droplets
 * (where chromium + agent-browser are pre-installed) and leaves it unset for
 * self-host runtimes (where the binaries may not be available).
 */
export declare const BROWSER_USE_PROMPT_ADDENDUM: string;
/**
 * Append the browser-use addendum to a system prompt fragment, but only when
 * the `CYRUS_BROWSER_USE_ENABLED` env var is truthy. Returns the existing
 * prompt unchanged otherwise.
 */
export declare function appendBrowserUseAddendum(existing: string | undefined | null): string;
//# sourceMappingURL=browserUsePromptAddendum.d.ts.map