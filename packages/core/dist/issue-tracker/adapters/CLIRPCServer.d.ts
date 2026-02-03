/**
 * CLI RPC Server - Fastify-based JSON-RPC handler for F1 testing framework
 *
 * This server exposes HTTP endpoints that bridge the F1 CLI binary with the
 * CLIIssueTrackerService and EdgeWorker, enabling command routing, pagination,
 * and session management.
 *
 * @module issue-tracker/adapters/CLIRPCServer
 */
import type { FastifyInstance } from "fastify";
import type { Comment, Issue } from "../types.js";
import type { CLIIssueTrackerService } from "./CLIIssueTrackerService.js";
/**
 * RPC command type union for all supported commands
 */
export type RPCCommand = "ping" | "status" | "version" | "createIssue" | "assignIssue" | "createComment" | "startSession" | "viewSession" | "promptSession" | "stopSession" | "listAgentSessions";
/**
 * JSON-RPC 2.0 request ID type
 */
export type RPCRequestId = number | string | null;
/**
 * Generic RPC request structure (JSON-RPC 2.0 compliant)
 */
export interface RPCRequest<TParams = unknown> {
    jsonrpc: "2.0";
    method: RPCCommand;
    params?: TParams;
    id: RPCRequestId;
}
/**
 * JSON-RPC 2.0 error object
 */
export interface RPCError {
    code: number;
    message: string;
    data?: unknown;
}
/**
 * Generic RPC response structure (JSON-RPC 2.0 compliant)
 */
export interface RPCResponse<TResult = unknown> {
    jsonrpc: "2.0";
    result?: TResult;
    error?: RPCError;
    id: RPCRequestId;
}
/**
 * Standard JSON-RPC 2.0 error codes
 */
export declare const RPCErrorCodes: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly SERVER_ERROR: -32000;
};
/**
 * Ping command parameters (no params needed)
 */
export type PingParams = Record<string, never>;
/**
 * Ping command response data
 */
export interface PingData {
    message: string;
    timestamp: number;
}
/**
 * Status command parameters (no params needed)
 */
export type StatusParams = Record<string, never>;
/**
 * Status command response data
 */
export interface StatusData {
    uptime: number;
    status: "ready";
    server: string;
}
/**
 * Version command parameters (no params needed)
 */
export type VersionParams = Record<string, never>;
/**
 * Version command response data
 */
export interface VersionData {
    version: string;
    platform: string;
}
/**
 * Create issue command parameters
 */
export interface CreateIssueParams {
    teamId: string;
    title: string;
    description?: string;
    priority?: number;
    stateId?: string;
    /**
     * Label names (not IDs) - labels will be created if they don't exist
     */
    labels?: string[];
}
/**
 * Create issue command response data
 */
export interface CreateIssueData {
    issue: Issue;
}
/**
 * Assign issue command parameters
 */
export interface AssignIssueParams {
    issueId: string;
    userId: string;
}
/**
 * Assign issue command response data
 */
export interface AssignIssueData {
    issue: Issue;
}
/**
 * Create comment command parameters
 */
export interface CreateCommentParams {
    issueId: string;
    body: string;
}
/**
 * Create comment command response data
 */
export interface CreateCommentData {
    comment: Comment;
}
/**
 * Start session command parameters
 */
export interface StartSessionParams {
    issueId: string;
    externalLink?: string;
}
/**
 * Agent session data returned from start/view commands
 */
export interface AgentSessionData {
    sessionId: string;
    issueId: string;
    status: string;
    createdAt: number;
    updatedAt: number;
}
/**
 * Start session command response data
 */
export interface StartSessionData {
    session: AgentSessionData;
}
/**
 * View session command parameters
 */
export interface ViewSessionParams {
    sessionId: string;
    limit?: number;
    offset?: number;
    search?: string;
}
/**
 * Agent activity data for view session response
 */
export interface AgentActivityData {
    id: string;
    type: string;
    content: string;
    createdAt: number;
}
/**
 * View session command response data
 */
export interface ViewSessionData {
    session: AgentSessionData;
    activities: AgentActivityData[];
    totalCount: number;
    hasMore: boolean;
}
/**
 * Prompt session command parameters
 */
export interface PromptSessionParams {
    sessionId: string;
    message: string;
}
/**
 * Prompt session command response data
 */
export interface PromptSessionData {
    success: boolean;
    message: string;
}
/**
 * Stop session command parameters
 */
export interface StopSessionParams {
    sessionId: string;
}
/**
 * Stop session command response data
 */
export interface StopSessionData {
    success: boolean;
    message: string;
}
/**
 * List agent sessions command parameters
 */
export interface ListAgentSessionsParams {
    issueId?: string;
    limit?: number;
    offset?: number;
}
/**
 * List agent sessions command response data
 */
export interface ListAgentSessionsData {
    sessions: AgentSessionData[];
    totalCount: number;
    hasMore: boolean;
}
/**
 * CLI RPC Server configuration
 */
export interface CLIRPCServerConfig {
    /**
     * Fastify instance to register routes on
     */
    fastifyServer: FastifyInstance;
    /**
     * CLIIssueTrackerService instance to delegate to
     */
    issueTracker: CLIIssueTrackerService;
    /**
     * Version string to return for version command
     */
    version?: string;
}
/**
 * CLI RPC Server
 *
 * Exposes HTTP JSON-RPC endpoints for CLI commands, delegating to
 * CLIIssueTrackerService for all operations.
 *
 * @example
 * ```typescript
 * const server = new CLIRPCServer({
 *   fastifyServer: app,
 *   issueTracker: cliIssueTracker,
 *   version: "1.0.0"
 * });
 *
 * server.register();
 * ```
 */
export declare class CLIRPCServer {
    private config;
    private startTime;
    constructor(config: CLIRPCServerConfig);
    /**
     * Register the /cli/rpc endpoint with Fastify
     */
    register(): void;
    /**
     * Route commands to appropriate handlers
     */
    private handleCommand;
    /**
     * Handle ping command - health check
     */
    private handlePing;
    /**
     * Handle status command - server status with uptime
     */
    private handleStatus;
    /**
     * Handle version command - version info
     */
    private handleVersion;
    /**
     * Handle createIssue command - create new issue
     */
    private handleCreateIssue;
    /**
     * Handle assignIssue command - assign issue to user
     */
    private handleAssignIssue;
    /**
     * Handle createComment command - add comment to issue
     */
    private handleCreateComment;
    /**
     * Handle startSession command - start agent session on issue
     */
    private handleStartSession;
    /**
     * Handle viewSession command - view session with activity pagination
     */
    private handleViewSession;
    /**
     * Handle promptSession command - send message to session
     */
    private handlePromptSession;
    /**
     * Handle stopSession command - stop agent session
     */
    private handleStopSession;
    /**
     * Handle listAgentSessions command - list all sessions (optional)
     */
    private handleListAgentSessions;
}
//# sourceMappingURL=CLIRPCServer.d.ts.map