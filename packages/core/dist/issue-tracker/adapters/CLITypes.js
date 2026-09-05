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
/**
 * Create a CLI Issue object compatible with our Pick-based Issue type.
 */
export function createCLIIssue(data, resolvedLabels) {
    // Create a partial object with all the required properties
    const issue = {
        // Direct properties
        id: data.id,
        identifier: data.identifier,
        title: data.title,
        description: data.description,
        number: data.number,
        url: data.url,
        branchName: data.branchName,
        priority: data.priority,
        priorityLabel: data.priorityLabel,
        estimate: data.estimate,
        boardOrder: data.boardOrder,
        sortOrder: data.sortOrder,
        subIssueSortOrder: data.subIssueSortOrder,
        prioritySortOrder: data.prioritySortOrder,
        labelIds: data.labelIds,
        previousIdentifiers: data.previousIdentifiers,
        trashed: data.trashed,
        customerTicketCount: data.customerTicketCount,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt,
        autoArchivedAt: data.autoArchivedAt,
        autoClosedAt: data.autoClosedAt,
        canceledAt: data.canceledAt,
        completedAt: data.completedAt,
        startedAt: data.startedAt,
        addedToCycleAt: data.addedToCycleAt,
        addedToProjectAt: data.addedToProjectAt,
        addedToTeamAt: data.addedToTeamAt,
        startedTriageAt: data.startedTriageAt,
        triagedAt: data.triagedAt,
        slaStartedAt: data.slaStartedAt,
        slaBreachesAt: data.slaBreachesAt,
        slaHighRiskAt: data.slaHighRiskAt,
        slaMediumRiskAt: data.slaMediumRiskAt,
        snoozedUntilAt: data.snoozedUntilAt,
        // Relationship ID getters
        get assigneeId() {
            return data.assigneeId;
        },
        get creatorId() {
            return data.creatorId;
        },
        get delegateId() {
            return data.delegateId;
        },
        get teamId() {
            return data.teamId;
        },
        get stateId() {
            return data.stateId;
        },
        get projectId() {
            return data.projectId;
        },
        get parentId() {
            return data.parentId;
        },
        // Relationship getters (return Promise<Type> | undefined)
        get assignee() {
            return undefined;
        },
        get creator() {
            return undefined;
        },
        get delegate() {
            return undefined;
        },
        get team() {
            return undefined;
        },
        get state() {
            return undefined;
        },
        get parent() {
            return undefined;
        },
        get project() {
            return undefined;
        },
        // Collection methods - now use simplified Connection<T> (no casts needed!)
        children(_variables) {
            return Promise.resolve({ nodes: [] });
        },
        comments(_variables) {
            return Promise.resolve({ nodes: [] });
        },
        labels(_variables) {
            if (!resolvedLabels || resolvedLabels.length === 0) {
                return Promise.resolve({ nodes: [] });
            }
            return Promise.resolve({
                nodes: resolvedLabels.map((label) => createCLILabel(label)),
            });
        },
        attachments(_variables) {
            return Promise.resolve({ nodes: [] });
        },
        inverseRelations(_variables) {
            return Promise.resolve({ nodes: [] });
        },
        update(_input) {
            return Promise.resolve({
                success: true,
                issue: undefined,
                lastSyncId: 0,
            });
        },
    };
    // Return directly - structurally compatible with our Pick-based Issue type
    return issue;
}
/**
 * Create a CLI Comment object compatible with our Pick-based Comment type.
 */
export function createCLIComment(data) {
    const comment = {
        id: data.id,
        body: data.body,
        url: data.url,
        quotedText: data.quotedText,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt,
        editedAt: data.editedAt,
        resolvedAt: data.resolvedAt,
        reactionData: [],
        reactions: () => Promise.resolve({ nodes: [] }),
        // Relationship ID getters
        get userId() {
            return data.userId;
        },
        get issueId() {
            return data.issueId;
        },
        get parentId() {
            return data.parentId;
        },
        get agentSessionId() {
            return data.agentSessionId;
        },
        // Relationship getters (return Promise<Type> | undefined)
        get user() {
            return undefined;
        },
        get issue() {
            return undefined;
        },
        get parent() {
            return undefined;
        },
        get agentSession() {
            return undefined;
        },
        // Collection methods - now use simplified Connection<T> (no casts needed!)
        children(_variables) {
            return Promise.resolve({ nodes: [] });
        },
    };
    return comment;
}
/**
 * Create a CLI Team object compatible with our Pick-based Team type.
 */
export function createCLITeam(data) {
    const team = {
        id: data.id,
        key: data.key,
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        icon: data.icon,
        color: data.color,
        private: data.private,
        issueCount: data.issueCount,
        inviteHash: data.inviteHash,
        cyclesEnabled: data.cyclesEnabled,
        cycleDuration: data.cycleDuration,
        cycleCooldownTime: data.cycleCooldownTime,
        cycleStartDay: data.cycleStartDay,
        cycleLockToActive: data.cycleLockToActive,
        cycleIssueAutoAssignStarted: data.cycleIssueAutoAssignStarted,
        cycleIssueAutoAssignCompleted: data.cycleIssueAutoAssignCompleted,
        defaultIssueEstimate: data.defaultIssueEstimate,
        issueEstimationType: data.issueEstimationType,
        issueEstimationAllowZero: data.issueEstimationAllowZero,
        issueEstimationExtended: data.issueEstimationExtended,
        autoArchivePeriod: data.autoArchivePeriod,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt,
        // Relationship ID getters
        get defaultIssueStateId() {
            return data.defaultIssueStateId;
        },
        get triageIssueStateId() {
            return data.triageIssueStateId;
        },
        // Relationship getters
        get defaultIssueState() {
            return Promise.resolve(undefined);
        },
        get triageIssueState() {
            return Promise.resolve(undefined);
        },
        // Collection methods - now use simplified Connection<T> (no casts needed!)
        states(_variables) {
            return Promise.resolve({ nodes: [] });
        },
        members(_variables) {
            return Promise.resolve({ nodes: [] });
        },
    };
    return team;
}
/**
 * Create a CLI User object compatible with our Pick-based User type.
 */
export function createCLIUser(data) {
    const user = {
        id: data.id,
        name: data.name,
        displayName: data.displayName,
        email: data.email,
        url: data.url,
        active: data.active,
        admin: data.admin,
        app: data.app,
        guest: data.guest,
        isMe: data.isMe,
        isAssignable: data.isAssignable,
        isMentionable: data.isMentionable,
        avatarUrl: data.avatarUrl,
        avatarBackgroundColor: data.avatarBackgroundColor,
        initials: data.initials,
        description: data.description,
        createdIssueCount: data.createdIssueCount,
        statusEmoji: data.statusEmoji,
        statusLabel: data.statusLabel,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt,
        lastSeen: data.lastSeen,
        // Methods
        assignedIssues: () => Promise.resolve({ nodes: [] }),
        createdIssues: () => Promise.resolve({ nodes: [] }),
        teams: () => Promise.resolve({ nodes: [] }),
    };
    return user;
}
/**
 * Create a CLI WorkflowState object compatible with our Pick-based WorkflowState type.
 */
export function createCLIWorkflowState(data) {
    const state = {
        id: data.id,
        name: data.name,
        description: data.description,
        color: data.color,
        type: data.type,
        position: data.position,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt,
        // Relationship ID getters
        get teamId() {
            return data.teamId;
        },
        // Relationship getters
        get team() {
            return Promise.resolve(undefined);
        },
        // Collection methods
        issues: () => Promise.resolve({ nodes: [] }),
    };
    return state;
}
/**
 * Create a CLI Label object compatible with our Pick-based Label type.
 */
export function createCLILabel(data) {
    const label = {
        id: data.id,
        name: data.name,
        description: data.description,
        color: data.color,
        isGroup: data.isGroup,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt,
        // Relationship ID getters
        get teamId() {
            return data.teamId;
        },
        get creatorId() {
            return data.creatorId;
        },
        get parentId() {
            return data.parentId;
        },
        // Relationship getters
        get team() {
            return Promise.resolve(undefined);
        },
        get creator() {
            return Promise.resolve(undefined);
        },
        get parent() {
            return Promise.resolve(undefined);
        },
        // Collection methods
        children: () => Promise.resolve({ nodes: [] }),
        issues: () => Promise.resolve({ nodes: [] }),
    };
    return label;
}
/**
 * Create a CLI AgentSession object using our simplified AgentSessionSDKType.
 * No casts needed - uses Pick-based type with simplified Connection!
 */
export function createCLIAgentSession(data) {
    return {
        // Direct properties
        id: data.id,
        externalLink: data.externalLink,
        summary: data.summary,
        status: data.status,
        type: data.type,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        // Relationship IDs - direct properties from Pick
        appUserId: data.appUserId,
        creatorId: data.creatorId,
        issueId: data.issueId,
        commentId: data.commentId,
        // Relationship async getters - return undefined to match Promise<T> | undefined type
        get appUser() {
            return undefined;
        },
        get creator() {
            return undefined;
        },
        get issue() {
            return undefined;
        },
        get comment() {
            return undefined;
        },
        // Collection method - return Promise wrapping Connection
        activities(_variables) {
            return Promise.resolve({ nodes: [] });
        },
    };
}
//# sourceMappingURL=CLITypes.js.map