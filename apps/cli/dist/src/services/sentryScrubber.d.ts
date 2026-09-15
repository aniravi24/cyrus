import type { ErrorEvent, EventHint } from "@sentry/node";
/**
 * Mirrors Sentry's `Log` shape just enough for the scrubber to operate on it.
 * Generic over the level type so this hook plugs into the SDK's `beforeSendLog`
 * signature without redeclaring the LogSeverityLevel literal union here.
 */
export interface SentryLog<LevelT = string> {
    level: LevelT;
    message: unknown;
    attributes?: Record<string, unknown>;
    severityNumber?: number;
}
/**
 * Strip token-shaped substrings from a Sentry event. Mutates and returns the
 * event so it can be used directly as a `beforeSend` hook.
 */
export declare function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null;
/**
 * Scrub a Sentry Logs entry. Wired as `beforeSendLog` on `Sentry.init`. The
 * Logs stream is a separate pipeline from Issues — `beforeSend` does not run
 * on logs, so we need a dedicated hook to keep the redaction guarantees
 * symmetric across both ingestion paths.
 *
 * Generic in `T` so the SDK's stricter `Log` shape (with `level:
 * LogSeverityLevel`) flows through unchanged — TypeScript would otherwise
 * narrow the return to a looser `string` level on assignment.
 */
export declare function scrubSentryLog<T extends SentryLog<unknown>>(log: T): T;
//# sourceMappingURL=sentryScrubber.d.ts.map