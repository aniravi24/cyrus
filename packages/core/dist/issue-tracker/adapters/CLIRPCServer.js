/**
 * CLI RPC Server - Fastify-based JSON-RPC handler for F1 testing framework
 *
 * This server exposes HTTP endpoints that bridge the F1 CLI binary with the
 * CLIIssueTrackerService and EdgeWorker, enabling command routing, pagination,
 * and session management.
 *
 * @module issue-tracker/adapters/CLIRPCServer
 */
/**
 * Standard JSON-RPC 2.0 error codes
 */
export const RPCErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    SERVER_ERROR: -32000, // Generic server error
};
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
export class CLIRPCServer {
    config;
    startTime;
    constructor(config) {
        this.config = config;
        this.startTime = Date.now();
    }
    /**
     * Register the /cli/rpc endpoint with Fastify
     */
    register() {
        this.config.fastifyServer.post("/cli/rpc", async (request, reply) => {
            const requestId = request.body?.id ?? null;
            try {
                const { method, params } = request.body;
                // Route to appropriate handler
                const response = await this.handleCommand(method, params, requestId);
                reply.send(response);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                reply.send({
                    jsonrpc: "2.0",
                    error: {
                        code: RPCErrorCodes.INTERNAL_ERROR,
                        message: errorMessage,
                    },
                    id: requestId,
                });
            }
        });
    }
    /**
     * Route commands to appropriate handlers
     */
    async handleCommand(method, params, requestId) {
        switch (method) {
            case "ping":
                return this.handlePing(params, requestId);
            case "status":
                return this.handleStatus(params, requestId);
            case "version":
                return this.handleVersion(params, requestId);
            case "createIssue":
                return this.handleCreateIssue(params, requestId);
            case "assignIssue":
                return this.handleAssignIssue(params, requestId);
            case "createComment":
                return this.handleCreateComment(params, requestId);
            case "startSession":
                return this.handleStartSession(params, requestId);
            case "viewSession":
                return this.handleViewSession(params, requestId);
            case "promptSession":
                return this.handlePromptSession(params, requestId);
            case "stopSession":
                return this.handleStopSession(params, requestId);
            case "listAgentSessions":
                return this.handleListAgentSessions(params, requestId);
            default:
                return {
                    jsonrpc: "2.0",
                    error: {
                        code: RPCErrorCodes.METHOD_NOT_FOUND,
                        message: `Unknown command: ${method}`,
                    },
                    id: requestId,
                };
        }
    }
    /**
     * Handle ping command - health check
     */
    async handlePing(_params, requestId) {
        return {
            jsonrpc: "2.0",
            result: {
                message: "pong",
                timestamp: Date.now(),
            },
            id: requestId,
        };
    }
    /**
     * Handle status command - server status with uptime
     */
    async handleStatus(_params, requestId) {
        return {
            jsonrpc: "2.0",
            result: {
                uptime: Date.now() - this.startTime,
                status: "ready",
                server: "CLIRPCServer",
            },
            id: requestId,
        };
    }
    /**
     * Handle version command - version info
     */
    async handleVersion(_params, requestId) {
        return {
            jsonrpc: "2.0",
            result: {
                version: this.config.version ?? "unknown",
                platform: "cli",
            },
            id: requestId,
        };
    }
    /**
     * Handle createIssue command - create new issue
     */
    async handleCreateIssue(params, requestId) {
        const { teamId, title, description, priority, stateId, labels } = params;
        if (!teamId || !title) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.INVALID_PARAMS,
                    message: "Missing required parameters: teamId and title are required",
                },
                id: requestId,
            };
        }
        try {
            // Resolve label names to IDs (creating labels if they don't exist)
            let labelIds;
            if (labels && labels.length > 0) {
                labelIds = await Promise.all(labels.map((labelName) => this.config.issueTracker.findOrCreateLabel(labelName)));
            }
            const issue = await this.config.issueTracker.createIssue({
                teamId,
                title,
                description,
                priority,
                stateId,
                labelIds,
            });
            return {
                jsonrpc: "2.0",
                result: {
                    issue,
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error ? error.message : "Failed to create issue",
                },
                id: requestId,
            };
        }
    }
    /**
     * Handle assignIssue command - assign issue to user
     */
    async handleAssignIssue(params, requestId) {
        const { issueId, userId } = params;
        if (!issueId || !userId) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.INVALID_PARAMS,
                    message: "Missing required parameters: issueId and userId are required",
                },
                id: requestId,
            };
        }
        try {
            const updates = {
                assigneeId: userId,
            };
            const issue = await this.config.issueTracker.updateIssue(issueId, updates);
            return {
                jsonrpc: "2.0",
                result: {
                    issue,
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error ? error.message : "Failed to assign issue",
                },
                id: requestId,
            };
        }
    }
    /**
     * Handle createComment command - add comment to issue
     */
    async handleCreateComment(params, requestId) {
        const { issueId, body } = params;
        if (!issueId || !body) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.INVALID_PARAMS,
                    message: "Missing required parameters: issueId and body are required",
                },
                id: requestId,
            };
        }
        try {
            const input = {
                body,
            };
            const comment = await this.config.issueTracker.createComment(issueId, input);
            return {
                jsonrpc: "2.0",
                result: {
                    comment,
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error ? error.message : "Failed to create comment",
                },
                id: requestId,
            };
        }
    }
    /**
     * Handle startSession command - start agent session on issue
     */
    async handleStartSession(params, requestId) {
        const { issueId, externalLink } = params;
        if (!issueId) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.INVALID_PARAMS,
                    message: "Missing required parameter: issueId is required",
                },
                id: requestId,
            };
        }
        try {
            const input = {
                issueId,
                ...(externalLink && { externalLink }),
            };
            const result = await this.config.issueTracker.createAgentSessionOnIssue(input);
            // Extract session from LinearFetch result
            const agentSessionPayload = await result;
            // Access agentSession property safely
            const agentSession = await agentSessionPayload.agentSession;
            if (!agentSession) {
                throw new Error("Failed to create agent session - no session returned");
            }
            return {
                jsonrpc: "2.0",
                result: {
                    session: {
                        sessionId: agentSession.id,
                        issueId,
                        status: agentSession.status ?? "unknown",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error ? error.message : "Failed to start session",
                },
                id: requestId,
            };
        }
    }
    /**
     * Handle viewSession command - view session with activity pagination
     */
    async handleViewSession(params, requestId) {
        const { sessionId, limit = 50, offset = 0, search } = params;
        if (!sessionId) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.INVALID_PARAMS,
                    message: "Missing required parameter: sessionId is required",
                },
                id: requestId,
            };
        }
        try {
            // Fetch session
            const agentSession = await this.config.issueTracker.fetchAgentSession(sessionId);
            // Fetch ALL activities from the issue tracker (no limit yet)
            const activityDataList = this.config.issueTracker.listAgentActivities(sessionId);
            // Filter out ephemeral activities that have been replaced by subsequent activities
            // An ephemeral activity is replaced if there's ANY activity that comes after it
            const visibleActivities = activityDataList.filter((activity, index) => {
                // If this activity is not ephemeral, it's always visible
                if (activity.ephemeral !== true) {
                    return true;
                }
                // If this is an ephemeral activity, check if there's any activity after it (by index)
                // If there is, this ephemeral activity should be hidden (replaced)
                // We use index comparison because activities may have the same timestamp
                const hasSubsequentActivity = activityDataList.some((_otherActivity, otherIndex) => otherIndex > index);
                // Show ephemeral activity only if there's no subsequent activity
                return !hasSubsequentActivity;
            });
            // Filter by search if provided
            let filteredActivities = visibleActivities;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredActivities = visibleActivities.filter((a) => a.content.toLowerCase().includes(searchLower));
            }
            // Apply pagination after filtering
            const paginatedActivityData = filteredActivities.slice(offset, offset + limit);
            // Check if there are more activities
            const hasMore = filteredActivities.length > offset + limit;
            // Transform to AgentActivityData format
            const activities = paginatedActivityData.map((activityData) => ({
                id: activityData.id,
                type: activityData.type,
                content: activityData.content,
                createdAt: activityData.createdAt.getTime(),
            }));
            // Total count is based on filtered activities
            const totalCount = filteredActivities.length;
            return {
                jsonrpc: "2.0",
                result: {
                    session: {
                        sessionId: agentSession.id,
                        issueId: agentSession.issueId ?? "unknown",
                        status: agentSession.status ?? "unknown",
                        createdAt: agentSession.createdAt.getTime(),
                        updatedAt: agentSession.updatedAt.getTime(),
                    },
                    activities,
                    totalCount,
                    hasMore,
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error ? error.message : "Failed to view session",
                },
                id: requestId,
            };
        }
    }
    /**
     * Handle promptSession command - send message to session
     */
    async handlePromptSession(params, requestId) {
        const { sessionId, message } = params;
        if (!sessionId || !message) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.INVALID_PARAMS,
                    message: "Missing required parameters: sessionId and message are required",
                },
                id: requestId,
            };
        }
        try {
            // Prompt the session - this creates a comment and emits a prompted event
            await this.config.issueTracker.promptAgentSession(sessionId, message);
            return {
                jsonrpc: "2.0",
                result: {
                    success: true,
                    message: "Session prompted successfully",
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error ? error.message : "Failed to prompt session",
                },
                id: requestId,
            };
        }
    }
    /**
     * Handle stopSession command - stop agent session
     */
    async handleStopSession(params, requestId) {
        const { sessionId } = params;
        if (!sessionId) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.INVALID_PARAMS,
                    message: "Missing required parameter: sessionId is required",
                },
                id: requestId,
            };
        }
        try {
            // Import AgentSessionStatus for the update
            const { AgentSessionStatus } = await import("../types.js");
            // Update the session status to complete
            await this.config.issueTracker.updateAgentSessionStatus(sessionId, AgentSessionStatus.Complete);
            // Emit stop signal event for EdgeWorker to handle
            await this.config.issueTracker.emitStopSignalEvent(sessionId);
            return {
                jsonrpc: "2.0",
                result: {
                    success: true,
                    message: "Session stopped successfully",
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error ? error.message : "Failed to stop session",
                },
                id: requestId,
            };
        }
    }
    /**
     * Handle listAgentSessions command - list all sessions (optional)
     */
    async handleListAgentSessions(params, requestId) {
        const { issueId, limit = 50, offset = 0 } = params;
        try {
            // Get sessions from the issue tracker
            const sessionDataList = this.config.issueTracker.listAgentSessions({
                issueId,
                limit: limit + 1, // Fetch one extra to check hasMore
                offset,
            });
            // Check if there are more sessions
            const hasMore = sessionDataList.length > limit;
            const paginatedSessionData = hasMore
                ? sessionDataList.slice(0, limit)
                : sessionDataList;
            // Transform to AgentSessionData format
            const sessions = paginatedSessionData.map((sessionData) => ({
                sessionId: sessionData.id,
                issueId: sessionData.issueId ?? "unknown",
                status: sessionData.status ?? "unknown",
                createdAt: sessionData.createdAt.getTime(),
                updatedAt: sessionData.updatedAt.getTime(),
            }));
            // Get total count (approximate - would need separate count query for accuracy)
            const allSessions = this.config.issueTracker.listAgentSessions({
                issueId,
            });
            const totalCount = allSessions.length;
            return {
                jsonrpc: "2.0",
                result: {
                    sessions,
                    totalCount,
                    hasMore,
                },
                id: requestId,
            };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: RPCErrorCodes.SERVER_ERROR,
                    message: error instanceof Error
                        ? error.message
                        : "Failed to list agent sessions",
                },
                id: requestId,
            };
        }
    }
}
//# sourceMappingURL=CLIRPCServer.js.map