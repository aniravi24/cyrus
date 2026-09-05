import type { LinearClient } from "@linear/sdk";
import type { McpServerConfig } from "cyrus-claude-runner";
import type { IIssueTrackerService, RepositoryConfig } from "cyrus-core";
import { type CyrusToolsOptions, createCyrusToolsServer } from "cyrus-mcp-tools";
type CyrusToolsMcpContextEntry = {
    contextId: string;
    linearToken: string;
    linearClient: LinearClient;
    parentSessionId?: string;
    prebuiltServer?: ReturnType<typeof createCyrusToolsServer>;
    createdAt: number;
};
/**
 * Dependencies injected into McpConfigService from the EdgeWorker.
 */
export interface McpConfigServiceDeps {
    /** Retrieve the stored Linear API token for a workspace */
    getLinearTokenForWorkspace: (workspaceId: string) => string | null;
    /** Retrieve the issue tracker service for a workspace (must expose getClient()) */
    getIssueTracker: (workspaceId: string) => (IIssueTrackerService & {
        getClient?: () => LinearClient;
    }) | undefined;
    /** Get the HTTP URL where the cyrus-tools MCP endpoint is registered */
    getCyrusToolsMcpUrl: () => string;
    /** Factory that creates CyrusToolsOptions with session callbacks */
    createCyrusToolsOptions: (parentSessionId?: string) => CyrusToolsOptions;
}
/**
 * Single source of truth for MCP server configuration assembly.
 *
 * Handles:
 * - Building inline MCP server configs (Linear, cyrus-tools, Slack)
 * - Merging file-based MCP config paths from repositories
 * - Cyrus-tools MCP context lifecycle management
 *
 * Both EdgeWorker (issue sessions) and ChatSessionHandler (chat sessions)
 * consume this service instead of duplicating MCP config logic.
 */
export declare class McpConfigService {
    private deps;
    private contexts;
    constructor(deps: McpConfigServiceDeps);
    /**
     * Build MCP configuration with automatic Linear server injection and cyrus-tools over Fastify MCP.
     * Workspace-level servers (Linear, cyrus-tools, Slack) are configured once using workspace-level token.
     *
     * Whether the agent can actually CALL into any of these servers is gated
     * by the per-platform allowed-tools array (`teams.{linear,slack,github}_allowed_tools`),
     * not by anything done here — so it's safe to always spin them up when
     * their underlying transport credentials exist (Slack inline via
     * `SLACK_BOT_TOKEN`, Linear via the workspace's Linear token, etc.).
     *
     * @param repoId - Repository ID for MCP context scoping
     * @param linearWorkspaceId - Linear workspace ID (from webhook.organizationId or repo config)
     * @param parentSessionId - Parent session ID for cyrus-tools context
     */
    buildMcpConfig(repoId: string, linearWorkspaceId: string, parentSessionId?: string): Record<string, McpServerConfig>;
    /**
     * Merge mcpConfigPath from multiple repositories into a single list.
     * For same-name .mcp.json servers across repos, last wins (handled by Claude's merge behavior).
     */
    buildMergedMcpConfigPath(repositories: RepositoryConfig | RepositoryConfig[]): string | string[] | undefined;
    /**
     * Look up a stored cyrus-tools MCP context by its ID.
     * Used by the MCP endpoint handler to retrieve prebuilt servers.
     */
    getContext(contextId: string): CyrusToolsMcpContextEntry | undefined;
    /**
     * Clear the prebuilt server from a context entry (after first use).
     */
    clearPrebuiltServer(contextId: string): void;
    /**
     * Clear all stored contexts. Used during shutdown.
     */
    clearAllContexts(): void;
    /**
     * Get the authorization header value for cyrus-tools MCP requests.
     */
    getAuthorizationHeaderValue(): string | undefined;
    /**
     * Validate an incoming authorization header against the expected value.
     */
    isAuthorizationValid(rawAuthorizationHeader: unknown): boolean;
    private buildContextId;
    private pruneContexts;
}
export {};
//# sourceMappingURL=McpConfigService.d.ts.map