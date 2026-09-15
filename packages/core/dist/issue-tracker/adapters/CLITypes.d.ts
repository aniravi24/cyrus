/**
 * CLI-specific implementations of issue tracker types.
 *
 * These factory functions create plain objects that match our Pick-based type
 * aliases defined in types.ts. Since our type aliases use Pick to select only
 * the properties and methods we actually use from Linear SDK, these objects
 * are structurally compatible without needing any type casts.
 *
 * This approach eliminates the need for `as unknown as` casts while maintaining
 * full type safety and compatibility with Linear SDK.
 *
 * @module issue-tracker/adapters/CLITypes
 */
import type { AgentSessionStatus, AgentSessionType } from "@linear/sdk";
import type { AgentSessionSDKType, Comment, Issue, Label, Team, User, WorkflowState } from "../types.js";
/**
 * Internal storage for a CLI Issue.
 * All relationships are stored as IDs, and getters return promises.
 */
export interface CLIIssueData {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    number: number;
    url: string;
    branchName: string;
    priority: number;
    priorityLabel: string;
    estimate?: number;
    boardOrder: number;
    sortOrder: number;
    subIssueSortOrder?: number;
    prioritySortOrder: number;
    labelIds: string[];
    previousIdentifiers: string[];
    trashed?: boolean;
    customerTicketCount: number;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    autoArchivedAt?: Date;
    autoClosedAt?: Date;
    canceledAt?: Date;
    completedAt?: Date;
    startedAt?: Date;
    addedToCycleAt?: Date;
    addedToProjectAt?: Date;
    addedToTeamAt?: Date;
    startedTriageAt?: Date;
    triagedAt?: Date;
    slaStartedAt?: Date;
    slaBreachesAt?: Date;
    slaHighRiskAt?: Date;
    slaMediumRiskAt?: Date;
    snoozedUntilAt?: Date;
    dueDate?: string;
    assigneeId?: string;
    creatorId?: string;
    delegateId?: string;
    teamId?: string;
    stateId?: string;
    projectId?: string;
    projectMilestoneId?: string;
    cycleId?: string;
    parentId?: string;
    snoozedById?: string;
    sourceCommentId?: string;
    favoriteId?: string;
}
/**
 * Internal storage for a CLI Comment.
 */
export interface CLICommentData {
    id: string;
    body: string;
    url: string;
    quotedText?: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    editedAt?: Date;
    resolvedAt?: Date;
    userId?: string;
    externalUserId?: string;
    issueId?: string;
    parentId?: string;
    agentSessionId?: string;
    resolvingUserId?: string;
    resolvingCommentId?: string;
}
/**
 * Internal storage for a CLI Team.
 */
export interface CLITeamData {
    id: string;
    key: string;
    name: string;
    displayName: string;
    description?: string;
    icon?: string;
    color?: string;
    private: boolean;
    issueCount: number;
    inviteHash: string;
    cyclesEnabled: boolean;
    cycleDuration: number;
    cycleCooldownTime: number;
    cycleStartDay: number;
    cycleLockToActive: boolean;
    cycleIssueAutoAssignStarted: boolean;
    cycleIssueAutoAssignCompleted: boolean;
    defaultIssueEstimate: number;
    issueEstimationType: string;
    issueEstimationAllowZero: boolean;
    issueEstimationExtended: boolean;
    autoArchivePeriod: number;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    defaultIssueStateId?: string;
    triageIssueStateId?: string;
}
/**
 * Internal storage for a CLI User.
 */
export interface CLIUserData {
    id: string;
    name: string;
    displayName: string;
    email: string;
    url: string;
    active: boolean;
    admin: boolean;
    app: boolean;
    guest: boolean;
    isMe: boolean;
    isAssignable: boolean;
    isMentionable: boolean;
    avatarUrl?: string;
    avatarBackgroundColor: string;
    initials: string;
    description?: string;
    createdIssueCount: number;
    statusEmoji?: string;
    statusLabel?: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    lastSeen?: Date;
}
/**
 * Internal storage for a CLI WorkflowState.
 */
export interface CLIWorkflowStateData {
    id: string;
    name: string;
    description?: string;
    color: string;
    type: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    teamId?: string;
}
/**
 * Internal storage for a CLI Label.
 */
export interface CLILabelData {
    id: string;
    name: string;
    description?: string;
    color: string;
    isGroup: boolean;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    teamId?: string;
    creatorId?: string;
    parentId?: string;
}
/**
 * Internal storage for a CLI AgentSession.
 */
export interface CLIAgentSessionData {
    id: string;
    externalLink?: string;
    summary?: string;
    status: AgentSessionStatus;
    type: AgentSessionType;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    appUserId?: string;
    creatorId?: string;
    issueId?: string;
    commentId?: string;
}
/**
 * Internal storage for a CLI AgentActivity.
 */
export interface CLIAgentActivityData {
    id: string;
    agentSessionId: string;
    type: string;
    content: string;
    createdAt: Date;
    ephemeral?: boolean;
    signal?: string;
}
/**
 * Create a CLI Issue object compatible with our Pick-based Issue type.
 */
export declare function createCLIIssue(data: CLIIssueData, resolvedLabels?: CLILabelData[]): Issue;
/**
 * Create a CLI Comment object compatible with our Pick-based Comment type.
 */
export declare function createCLIComment(data: CLICommentData): Comment;
/**
 * Create a CLI Team object compatible with our Pick-based Team type.
 */
export declare function createCLITeam(data: CLITeamData): Team;
/**
 * Create a CLI User object compatible with our Pick-based User type.
 */
export declare function createCLIUser(data: CLIUserData): User;
/**
 * Create a CLI WorkflowState object compatible with our Pick-based WorkflowState type.
 */
export declare function createCLIWorkflowState(data: CLIWorkflowStateData): WorkflowState;
/**
 * Create a CLI Label object compatible with our Pick-based Label type.
 */
export declare function createCLILabel(data: CLILabelData): Label;
/**
 * Create a CLI AgentSession object using our simplified AgentSessionSDKType.
 * No casts needed - uses Pick-based type with simplified Connection!
 */
export declare function createCLIAgentSession(data: CLIAgentSessionData): AgentSessionSDKType;
//# sourceMappingURL=CLITypes.d.ts.map