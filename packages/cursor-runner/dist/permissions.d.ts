export interface CyrusPermissionsConfig {
    workspace: string;
    allow: string[];
    deny: string[];
    /**
     * Lookup table the hook helper uses to derive the logical MCP server name
     * (e.g. "linear") from the `beforeMCPExecution` payload, which only carries
     * the `command`/`url` of the underlying transport — not the server name.
     * Without this, server-scoped patterns like `Mcp(linear:*)` cannot match
     * because we never see "linear" in the payload.
     */
    mcpServers?: CyrusPermissionsMcpServer[];
}
export interface CyrusPermissionsMcpServer {
    name: string;
    /** stdio: full reconstructed command line `${command} ${args.join(' ')}`. */
    commandLine?: string;
    /** http/sse: the URL string. */
    url?: string;
}
/**
 * Auto-deny patterns that protect the host system and worktree siblings
 * whenever a session has broad Read/Write permissions. Mirrors the same
 * scoping the old CLI-based runner applied via .cursor/cli.json.
 */
export declare function buildAutoDenyPatterns(args: {
    workspace: string;
    allowedTools?: string[];
}): string[];
/**
 * Build the final permissions config that ships into the worktree
 * alongside the permission-check helper. Returns deduplicated
 * allow/deny pattern lists in Cursor hook syntax.
 */
export declare function buildCyrusPermissionsConfig(args: {
    workspace: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    mcpServers?: Record<string, {
        command?: string;
        args?: string[];
        url?: string;
    }>;
}): CyrusPermissionsConfig;
//# sourceMappingURL=permissions.d.ts.map