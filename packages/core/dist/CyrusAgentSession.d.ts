/**
 * Agent Session types for Linear Agent Sessions integration
 * These types represent the core data structures for tracking agent sessions in Linear
 */
import type { IAgentRunner, SDKAssistantMessageError } from "./agent-runner-types.js";
import type { AgentSessionStatus, AgentSessionType } from "./issue-tracker/types.js";
export interface IssueMinimal {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    branchName: string;
}
export interface Workspace {
    path: string;
    isGitWorktree: boolean;
    historyPath?: string;
}
export interface CyrusAgentSession {
    linearAgentActivitySessionId: string;
    type: AgentSessionType.CommentThread;
    status: AgentSessionStatus;
    context: AgentSessionType.CommentThread;
    createdAt: number;
    updatedAt: number;
    issueId: string;
    issue: IssueMinimal;
    workspace: Workspace;
    claudeSessionId?: string;
    geminiSessionId?: string;
    agentRunner?: IAgentRunner;
    wasRunning?: boolean;
    metadata?: {
        model?: string;
        tools?: string[];
        permissionMode?: string;
        apiKeySource?: string;
        totalCostUsd?: number;
        usage?: any;
        commentId?: string;
        procedure?: {
            procedureName: string;
            currentSubroutineIndex: number;
            subroutineHistory: Array<{
                subroutine: string;
                completedAt: number;
                claudeSessionId: string | null;
                geminiSessionId: string | null;
            }>;
            /** State for validation loop (when current subroutine uses usesValidationLoop) */
            validationLoop?: {
                /** Current iteration (1-based) */
                iteration: number;
                /** Whether the loop is in fixer mode (running validation-fixer) */
                inFixerMode: boolean;
                /** Results from each validation attempt */
                attempts: Array<{
                    iteration: number;
                    pass: boolean;
                    reason: string;
                    timestamp: number;
                }>;
            };
        };
    };
}
export interface CyrusAgentSessionEntry {
    claudeSessionId?: string;
    geminiSessionId?: string;
    linearAgentActivityId?: string;
    type: "user" | "assistant" | "system" | "result";
    content: string;
    metadata?: {
        toolUseId?: string;
        toolName?: string;
        toolInput?: any;
        parentToolUseId?: string;
        toolResultError?: boolean;
        timestamp: number;
        durationMs?: number;
        isError?: boolean;
        sdkError?: SDKAssistantMessageError;
    };
}
//# sourceMappingURL=CyrusAgentSession.d.ts.map