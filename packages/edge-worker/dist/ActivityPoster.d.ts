import type { AgentActivityCreateInput, IIssueTrackerService, ILogger, RepoSetupHookEvent, RepositoryConfig } from "cyrus-core";
export declare class ActivityPoster {
    private issueTrackers;
    private repositories;
    private logger;
    constructor(issueTrackers: Map<string, IIssueTrackerService>, repositories: Map<string, RepositoryConfig>, logger: ILogger);
    postActivityDirect(issueTracker: IIssueTrackerService, input: AgentActivityCreateInput, label: string): Promise<string | null>;
    postThoughtActivity(sessionId: string, workspaceId: string, body: string): Promise<void>;
    postInstantAcknowledgment(sessionId: string, workspaceId: string): Promise<void>;
    postParentResumeAcknowledgment(sessionId: string, workspaceId: string): Promise<void>;
    postRoutingActivity(sessionId: string, workspaceId: string, repoLines: string[], routingMethod?: string): Promise<void>;
    postRepoSetupHookActivity(sessionId: string, workspaceId: string, event: RepoSetupHookEvent): Promise<void>;
    private formatRepoSetupHookResult;
    private formatRepoSetupHookFailureHint;
    private looksLikeSudoFailure;
    private formatDuration;
    private escapeCodeFence;
    postSystemPromptSelectionThought(sessionId: string, labels: string[], workspaceId: string, repositoryId: string): Promise<void>;
    postInstantPromptedAcknowledgment(sessionId: string, workspaceId: string, isStreaming: boolean): Promise<void>;
    postComment(issueId: string, body: string, workspaceId: string, parentId?: string): Promise<void>;
}
//# sourceMappingURL=ActivityPoster.d.ts.map