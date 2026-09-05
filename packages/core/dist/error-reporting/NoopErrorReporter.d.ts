import type { ErrorReporter } from "./ErrorReporter.js";
/**
 * No-op {@link ErrorReporter} used when error tracking is disabled (opt-out
 * via env var, missing DSN, or test harness).
 *
 * Liskov-compatible with any other reporter: every method is a safe no-op.
 */
export declare class NoopErrorReporter implements ErrorReporter {
    readonly isEnabled = false;
    captureException(): void;
    captureMessage(): void;
    log(): void;
    flush(): Promise<boolean>;
}
//# sourceMappingURL=NoopErrorReporter.d.ts.map