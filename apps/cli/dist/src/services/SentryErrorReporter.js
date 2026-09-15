import * as Sentry from "@sentry/node";
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
export class SentryErrorReporter {
    isEnabled = true;
    globalLogAttributes;
    constructor(options) {
        // Stash the global tag set (team_id, …) so every Sentry.logger.* call
        // merges them into per-log attributes — Sentry Logs has a separate
        // attributes store from event tags, so initialScope.tags doesn't reach
        // it. https://docs.sentry.io/product/explore/logs/
        this.globalLogAttributes = options.tags ? { ...options.tags } : {};
        Sentry.init({
            dsn: options.dsn,
            release: options.release,
            environment: options.environment ?? "production",
            sampleRate: options.sampleRate ?? 1.0,
            debug: options.debug ?? false,
            // Performance monitoring is intentionally disabled — we only ship
            // error tracking. Flip this on later if we need transaction data.
            tracesSampleRate: 0,
            // Issues and Logs share a single gate (CYRUS_TEAM_ID upstream); by
            // the time we get here both are wanted, so always enable Logs.
            enableLogs: true,
            beforeSend: options.beforeSend,
            beforeSendLog: options.beforeSendLog,
            // Append integrations that enrich every event with structured data:
            //   - extraErrorDataIntegration walks Error subclasses and serialises
            //     non-standard own properties as `extra` (so e.g. `err.statusCode`,
            //     `err.requestId`, custom Cyrus error fields surface in Sentry).
            //   - consoleIntegration captures console.* output as breadcrumbs so
            //     events arrive with a structured trail of the last log lines.
            integrations: (defaults) => [
                ...defaults,
                Sentry.extraErrorDataIntegration({ depth: 4 }),
                Sentry.consoleIntegration(),
            ],
            // Apply caller-provided tags (e.g. team_id) and a structured `cyrus`
            // context to every event. Tags are indexed/searchable; the context is
            // shown as a grouped structured block in the Sentry UI and is the
            // home for fields too noisy or unbounded to be tags.
            initialScope: buildInitialScope(options),
        });
    }
    captureException(error, context) {
        Sentry.withScope((scope) => {
            applyContext(scope, context);
            Sentry.captureException(error);
        });
    }
    captureMessage(message, severity = "info", context) {
        Sentry.withScope((scope) => {
            applyContext(scope, context);
            Sentry.captureMessage(message, severity);
        });
    }
    log(level, message, attributes) {
        // Merge per-call attributes on top of the process-wide set so team_id
        // (and any other CYRUS_* tag we configured) lands on every log record.
        const merged = {
            ...this.globalLogAttributes,
            ...attributes,
        };
        switch (level) {
            case "trace":
                Sentry.logger.trace(message, merged);
                break;
            case "debug":
                Sentry.logger.debug(message, merged);
                break;
            case "info":
                Sentry.logger.info(message, merged);
                break;
            case "warn":
                Sentry.logger.warn(message, merged);
                break;
            case "error":
                Sentry.logger.error(message, merged);
                break;
            case "fatal":
                Sentry.logger.fatal(message, merged);
                break;
        }
    }
    async flush(timeoutMs = 2000) {
        return Sentry.flush(timeoutMs);
    }
}
function buildInitialScope(options) {
    const hasTags = options.tags && Object.keys(options.tags).length > 0;
    const hasContext = options.structuredContext &&
        Object.keys(options.structuredContext).length > 0;
    if (!hasTags && !hasContext)
        return undefined;
    return {
        ...(hasTags ? { tags: options.tags } : {}),
        ...(hasContext ? { contexts: { cyrus: options.structuredContext } } : {}),
    };
}
function applyContext(scope, context) {
    if (!context)
        return;
    if (context.tags) {
        for (const [k, v] of Object.entries(context.tags))
            scope.setTag(k, v);
    }
    if (context.extra) {
        for (const [k, v] of Object.entries(context.extra))
            scope.setExtra(k, v);
    }
    if (context.user)
        scope.setUser(context.user);
    if (context.fingerprint && context.fingerprint.length > 0) {
        scope.setFingerprint(context.fingerprint);
    }
}
//# sourceMappingURL=SentryErrorReporter.js.map