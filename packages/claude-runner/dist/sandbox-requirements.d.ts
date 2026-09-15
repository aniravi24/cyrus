import type { ILogger } from "cyrus-core";
/**
 * A single failed sandbox requirement, with user-facing guidance
 * for how to fix the underlying issue.
 */
export interface SandboxRequirementFailure {
    /** Short identifier for the failed check (e.g., "socat", "bubblewrap", "bwrap-sandbox"). */
    check: string;
    /** Human-readable description of what failed. */
    message: string;
    /** Multi-line instructions explaining how to resolve the failure. */
    resolution: string;
}
/** Result of running the Linux sandbox requirements check. */
export interface SandboxRequirementsResult {
    /**
     * True when the host platform is supported and sandbox mode is safe to enable.
     * Non-Linux platforms (macOS, Windows) always return `supported: true` because
     * the Claude Code SDK does not require bubblewrap on those systems.
     */
    supported: boolean;
    /** Platform the check ran against — useful for diagnostics and testing. */
    platform: NodeJS.Platform;
    /** All failed checks (empty when `supported` is true). */
    failures: SandboxRequirementFailure[];
}
/**
 * Verify that the host Linux system has the packages and kernel/AppArmor
 * configuration required by the Claude Code SDK sandbox runtime.
 *
 * Setting `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` in the SDK's child process env
 * causes the SDK to run tooling under a bubblewrap-backed sandbox on Linux.
 * If the host is missing `socat`, `bubblewrap`, or cannot create an
 * unprivileged user namespace, those tool invocations will fail at runtime.
 *
 * This check returns a structured result so the caller can decide whether to
 * set the env var, and prints resolution guidance to stdout on the first
 * failed check so users running locally can self-diagnose.
 *
 * The result is cached per process; tests can use
 * {@link resetSandboxRequirementsCacheForTesting} to reset it.
 */
export declare function checkLinuxSandboxRequirements(): SandboxRequirementsResult;
/**
 * Log requirement failures as WARN-level messages via the dedicated logger.
 * The warnings are emitted at most once per process; subsequent calls are
 * no-ops regardless of which logger instance is passed.
 */
export declare function logSandboxRequirementFailures(result: SandboxRequirementsResult, logger: ILogger): void;
/**
 * Reset the cached requirements result and the "already logged" flag.
 * Intended for use in unit tests only.
 */
export declare function resetSandboxRequirementsCacheForTesting(): void;
//# sourceMappingURL=sandbox-requirements.d.ts.map