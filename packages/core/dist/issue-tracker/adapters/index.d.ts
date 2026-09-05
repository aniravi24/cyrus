/**
 * Issue tracker adapters
 *
 * Platform-specific implementations of IIssueTrackerService and related components
 *
 * @module issue-tracker/adapters
 */
export { CLIEventTransport } from "./CLIEventTransport.js";
export type { CLIIssueTrackerState } from "./CLIIssueTrackerService.js";
export { CLIIssueTrackerService } from "./CLIIssueTrackerService.js";
export type { AgentActivityData, AgentSessionData, AssignIssueData, AssignIssueParams, CLIRPCServerConfig, CreateCommentData, CreateCommentParams, CreateIssueData, CreateIssueParams, ListAgentSessionsData, ListAgentSessionsParams, PingData, PingParams, PromptSessionData, PromptSessionParams, RPCCommand, RPCRequest, RPCResponse, StartSessionData, StartSessionParams, StatusData, StatusParams, StopSessionData, StopSessionParams, VersionData, VersionParams, ViewSessionData, ViewSessionParams, } from "./CLIRPCServer.js";
export { CLIRPCServer } from "./CLIRPCServer.js";
export type { CLIAgentActivityData } from "./CLITypes.js";
//# sourceMappingURL=index.d.ts.map