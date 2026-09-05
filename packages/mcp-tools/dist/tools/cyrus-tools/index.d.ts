import { type LinearClient } from "@linear/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type FailureModesHttpClient, type ResolveSessionFromCwd } from "./log-failure-mode.js";
/**
 * Options for creating Cyrus tools with session management capabilities
 */
export interface CyrusToolsOptions {
    /**
     * Callback to register a child-to-parent session mapping
     * Called when a new agent session is created
     */
    onSessionCreated?: (childSessionId: string, parentSessionId: string) => void;
    /**
     * Callback to deliver feedback to a parent session
     * Called when feedback is given to a child session
     */
    onFeedbackDelivery?: (childSessionId: string, message: string) => Promise<boolean>;
    /**
     * The ID of the current parent session (if any)
     */
    parentSessionId?: string;
    /**
     * Optional dependencies for the `log_failure_mode` tool. When omitted,
     * the tool is not registered (e.g. in CLI mode without a control plane).
     */
    failureModes?: {
        resolveSessionFromCwd: ResolveSessionFromCwd;
        httpClient: FailureModesHttpClient;
    };
}
/**
 * Create a standard MCP SDK server with Cyrus tools.
 */
export declare function createCyrusToolsServer(linearClient: LinearClient, options?: CyrusToolsOptions): McpServer;
//# sourceMappingURL=index.d.ts.map