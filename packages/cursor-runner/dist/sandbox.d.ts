/**
 * Subset of `@anthropic-ai/claude-agent-sdk`'s `SandboxSettings` we know how
 * to translate. Defined locally (not imported) to avoid a hard dep on
 * cyrus-claude-runner — the EdgeWorker is the only consumer that originates
 * a SandboxSettings, and a structural type is enough.
 */
export interface CursorSandboxInput {
    enabled?: boolean;
    failIfUnavailable?: boolean;
    allowUnsandboxedCommands?: boolean;
    network?: {
        allowedDomains?: string[];
        deniedDomains?: string[];
        allowManagedDomainsOnly?: boolean;
        httpProxyPort?: number;
        socksProxyPort?: number;
    };
    filesystem?: {
        allowWrite?: string[];
        denyWrite?: string[];
        denyRead?: string[];
        allowRead?: string[];
    };
}
export interface CursorSandboxJson {
    type: "workspace_readwrite" | "workspace_readonly" | "insecure_none";
    additionalReadwritePaths: string[];
    additionalReadonlyPaths: string[];
    disableTmpWrite: boolean;
    enableSharedBuildCache: boolean;
    networkPolicy: {
        default: "allow" | "deny";
        allow: string[];
        deny: string[];
    };
}
export interface BuildSandboxArgs {
    workspace: string;
    sandboxSettings?: CursorSandboxInput;
    /** Path to a CA cert bundle for MITM TLS interception by the egress proxy. */
    egressCaCertPath?: string;
    /**
     * Extra paths Cursor's sandbox should treat as read+write (e.g. attachments
     * dir, additional repository paths in multi-repo issues). Workspace itself
     * is implicit in `workspace_readwrite`; pass only the *extras*.
     */
    additionalReadwritePaths?: string[];
}
/**
 * Returns the JSON document to write to `<workspace>/.cursor/sandbox.json`
 * when sandbox is enabled. Returns `null` when sandbox is disabled.
 */
export declare function buildCursorSandboxJson(args: BuildSandboxArgs): CursorSandboxJson | null;
/**
 * Returns the env vars to set on `process.env` (so child shell tools inherit
 * them) before invoking `agent.send`. These cover:
 *   - cert-trust env vars when an egress CA bundle is configured
 *   - HTTP_PROXY / HTTPS_PROXY / ALL_PROXY when the egress proxy is configured
 */
export declare function buildSandboxEnv(args: {
    sandboxSettings?: CursorSandboxInput;
    egressCaCertPath?: string;
}): Record<string, string>;
//# sourceMappingURL=sandbox.d.ts.map