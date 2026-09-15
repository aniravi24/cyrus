/**
 * No-op {@link ErrorReporter} used when error tracking is disabled (opt-out
 * via env var, missing DSN, or test harness).
 *
 * Liskov-compatible with any other reporter: every method is a safe no-op.
 */
export class NoopErrorReporter {
    isEnabled = false;
    captureException() {
        // intentionally empty
    }
    captureMessage() {
        // intentionally empty
    }
    log() {
        // intentionally empty
    }
    async flush() {
        return true;
    }
}
//# sourceMappingURL=NoopErrorReporter.js.map