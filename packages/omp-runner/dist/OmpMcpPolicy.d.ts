export interface OmpMcpPolicy {
    /** Servers omp must not load, highest-precedence denylist. */
    disabledServers: string[];
    /** Exact tool names to deny on servers admitted read-only. */
    deniedTools: string[];
}
/**
 * Reads `mcp__<server>` and `mcp__<server>__<tool>` entries out of the
 * allowlist. A bare server entry admits the whole server; tool entries admit it
 * read-only, so its write tools are denied by name.
 */
export declare function resolveMcpPolicy(allowedTools: ReadonlyArray<string> | undefined, cwd: string): OmpMcpPolicy;
//# sourceMappingURL=OmpMcpPolicy.d.ts.map