import * as Sentry from "@sentry/node";
import type { ErrorReporter, ErrorReporterContext, ErrorReporterLogAttributes, ErrorReporterLogLevel, ErrorReporterSeverity } from "cyrus-core";
export interface SentryErrorReporterOptions {
    dsn: string;
    release?: string;
    environment?: string;
    /**
     * Tags applied to every event emitted by this reporter (e.g. `team_id` from
     * `CYRUS_TEAM_ID`). See https://docs.sentry.io/platform-redirect/?next=/enriching-events/tags
     */
    tags?: Record<string, string>;
    /**
     * Structured context block attached to every event under the `cyrus` key.
     * Unlike tags, contexts are not indexed for search but support nested
     * structured data — ideal for grouping related fields (team_id, version,
     * environment, deployment) under one heading in the Sentry UI.
     */
    structuredContext?: Record<string, unknown>;
    /**
     * Sample rate for error events. Sentry's default is 1.0 (send everything).
     * Lower this if a high-volume error path needs sampling.
     */
    sampleRate?: number;
    /**
     * If true, prints debug logs from the SDK itself. Decoupled from
     * CYRUS_LOG_LEVEL — gate on the dedicated `CYRUS_SENTRY_DEBUG` env var so
     * app-level debugging doesn't pull in the firehose of Sentry-internal
     * tracing/transport chatter.
     */
    debug?: boolean;
    /**
     * Hook invoked before an event is sent. Returning null drops the event.
     * Useful for redacting sensitive payloads in tests.
     */
    beforeSend?: Parameters<typeof Sentry.init>[0] extends infer T ? T extends {
        beforeSend?: infer F;
    } ? F : never : never;
    /**
     * Hook invoked before a structured log entry is shipped to Sentry Logs.
     * Distinct from {@link beforeSend} (which only runs on Issues events) —
     * Logs have their own ingestion pipeline, so a separate redaction hook is
     * required to keep secret-scrubbing symmetric across both paths.
     */
    beforeSendLog?: Parameters<typeof Sentry.init>[0] extends infer T ? T extends {
        beforeSendLog?: infer F;
    } ? F : never : never;
}
/**
 * Sentry-backed {@link ErrorReporter}.
 *
 * Single Responsibility: this class only knows how to translate Cyrus-shaped
 * events into the Sentry SDK. It owns no application logic.
 *
 * The constructor initialises the Sentry SDK; therefore at most one instance
 * should be created per process. Use {@link createErrorReporter} as the entry
 * point — it enforces that contract along with the opt-out semantics.
 */
export declare class SentryErrorReporter implements ErrorReporter {
    readonly isEnabled = true;
    private readonly globalLogAttributes;
    constructor(options: SentryErrorReporterOptions);
    captureException(error: unknown, context?: ErrorReporterContext): void;
    captureMessage(message: string, severity?: ErrorReporterSeverity, context?: ErrorReporterContext): void;
    log(level: ErrorReporterLogLevel, message: string, attributes?: ErrorReporterLogAttributes): void;
    flush(timeoutMs?: number): Promise<boolean>;
}
//# sourceMappingURL=SentryErrorReporter.d.ts.map