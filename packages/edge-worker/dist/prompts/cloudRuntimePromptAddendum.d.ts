/**
 * Optional system-prompt addendum for Cyrus-managed cloud runtimes.
 *
 * On our managed cloud runtimes the dev environment's system-wide packages
 * (`apt` / global `npm`) are provisioned out-of-band from a curated list the
 * user controls at https://app.atcyrus.com/settings/packages. When the agent
 * finds a package missing, installing it ad-hoc inside the session won't
 * persist and may fail on permissions — the correct remedy is to tell the user
 * to add it via that settings page.
 *
 * Only injected when the environment variable `CYRUS_CLOUD_RUNTIME` is set to a
 * truthy value. cyrus-hosted sets this on cloud-runtime droplets and leaves it
 * unset for self-host runtimes (where the user manages their own packages).
 */
export declare const CLOUD_RUNTIME_PROMPT_ADDENDUM: string;
/**
 * Append the cloud-runtime addendum to a system prompt fragment, but only when
 * the `CYRUS_CLOUD_RUNTIME` env var is truthy. Returns the existing prompt
 * unchanged otherwise.
 */
export declare function appendCloudRuntimeAddendum(existing: string | undefined | null): string;
//# sourceMappingURL=cloudRuntimePromptAddendum.d.ts.map