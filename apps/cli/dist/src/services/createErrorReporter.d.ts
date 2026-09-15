import { type ErrorReporter } from "cyrus-core";
/**
 * Default DSN baked into release builds. Empty until an admin creates the
 * `ceedar/cyrus-cli` Sentry project and pastes the DSN here. Sentry DSNs are
 * safe to publish — they only authorise event ingestion.
 *
 * End users may override this with the `CYRUS_SENTRY_DSN` env var, or disable
 * reporting entirely with `CYRUS_SENTRY_DISABLED=1`.
 */
export declare const DEFAULT_SENTRY_DSN = "https://4a343e39f7439cb5669604657fca148e@o4509685010399232.ingest.us.sentry.io/4511293576839168";
export interface CreateErrorReporterParams {
    release?: string;
    /**
     * Reads default to `process.env`. Injected for tests.
     */
    env?: NodeJS.ProcessEnv;
}
/**
 * Build the application's {@link ErrorReporter}.
 *
 * Order of resolution:
 *   1. If `CYRUS_SENTRY_DISABLED` is truthy → noop.
 *   2. If `CYRUS_TEAM_ID` is unset → noop. Both Issues and Logs require a
 *      tenant tag so we can slice/filter per Cyrus install in Sentry; without
 *      it we send nothing rather than emit untenanted noise.
 *   3. Else if a DSN is available (env var or compiled default) → Sentry.
 *   4. Else → noop.
 *
 * Initialise this as early as possible during process startup so that
 * exceptions thrown by subsequent imports/bootstrap are captured.
 */
export declare function createErrorReporter(params?: CreateErrorReporterParams): ErrorReporter;
//# sourceMappingURL=createErrorReporter.d.ts.map