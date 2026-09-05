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
/**
 * Issue context for sessions attached to a specific issue.
 * Standalone sessions (e.g., direct agent invocation without an issue) will not have this.
 */
export interface IssueContext {
    /** The issue tracker identifier (e.g., "linear", "github") */
    trackerId: string;
    /** The unique issue ID from the tracker */
    issueId: string;
    /** The human-readable issue identifier (e.g., "CYPACK-123") */
    issueIdentifier: string;
}
/** Result of base branch resolution, including the source for reporting */
export interface BaseBranchResolution {
    /** The resolved base branch name */
    branch: string;
    /** Why this branch was selected */
    source: "commit-ish" | "graphite-blocked-by" | "parent-issue" | "default";
    /** Human-readable detail (e.g., blocking issue identifier) */
    detail?: string;
}
export interface Workspace {
    path: string;
    isGitWorktree: boolean;
    historyPath?: string;
    /** Maps repositoryId to worktree path for multi-repo workspaces */
    repoPaths?: Record<string, string>;
    /** Maps repositoryId to resolved base branch with source info */
    resolvedBaseBranches?: Record<string, BaseBranchResolution>;
}
/**
 * Lightweight repository context carried by each session.
 * Identifies which repository (and branches) the session operates on.
 * 0 entries = chatbot/no-repo session, 1 = single-repo, N = multi-repo.
 */
export interface RepositoryContext {
    /** The repository config ID (matches RepositoryConfig.id) */
    repositoryId: string;
    /** The git branch the session works on (e.g., derived from issue identifier) */
    branchName?: string;
    /** The base branch for PRs (e.g., "main" or a Graphite parent branch) */
    baseBranchName?: string;
}
export interface CyrusAgentSession {
    /** Unique session identifier (was linearAgentActivitySessionId in v2.0) */
    id: string;
    /** External session ID from the issue tracker (e.g., Linear's AgentSession ID) */
    externalSessionId?: string;
    type: AgentSessionType.CommentThread;
    status: AgentSessionStatus;
    context: AgentSessionType.CommentThread;
    createdAt: number;
    updatedAt: number;
    /** Issue context - optional for standalone sessions */
    issueContext?: IssueContext;
    /**
     * Issue ID - kept for backwards compatibility during transition
     * @deprecated Use issueContext.issueId instead
     */
    issueId?: string;
    /** Minimal issue data - optional for standalone sessions */
    issue?: IssueMinimal;
    /** Repository contexts for this session (always array, never undefined) */
    repositories: RepositoryContext[];
    workspace: Workspace;
    claudeSessionId?: string;
    geminiSessionId?: string;
    codexSessionId?: string;
    cursorSessionId?: string;
    opencodeSessionId?: string;
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
        /** Chat sessions: thread position up to which this session has context */
        lastContextTs?: string;
        /** Tracks crash recovery attempts to prevent infinite retry loops */
        crashRetryCount?: number;
    };
}
export interface CyrusAgentSessionEntry {
    claudeSessionId?: string;
    geminiSessionId?: string;
    codexSessionId?: string;
    cursorSessionId?: string;
    opencodeSessionId?: string;
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