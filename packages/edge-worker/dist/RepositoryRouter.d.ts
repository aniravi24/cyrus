import { type AgentSessionCreatedWebhook, type IIssueTrackerService, type RepositoryConfig } from "cyrus-core";
/**
 * Repository routing result types
 */
export type RepositoryRoutingResult = {
    type: "selected";
    repository: RepositoryConfig;
    routingMethod: "description-tag" | "label-based" | "project-based" | "team-based" | "team-prefix" | "catch-all" | "workspace-fallback";
} | {
    type: "needs_selection";
    workspaceRepos: RepositoryConfig[];
} | {
    type: "none";
};
/**
 * Pending repository selection data
 */
export interface PendingRepositorySelection {
    issueId: string;
    workspaceRepos: RepositoryConfig[];
}
/**
 * Repository router dependencies
 */
export interface RepositoryRouterDeps {
    /** Fetch issue labels for label-based routing */
    fetchIssueLabels: (issueId: string, workspaceId: string) => Promise<string[]>;
    /** Fetch issue description for description-tag routing */
    fetchIssueDescription: (issueId: string, workspaceId: string) => Promise<string | undefined>;
    /** Check if an issue has active sessions in a repository */
    hasActiveSession: (issueId: string, repositoryId: string) => boolean;
    /** Get issue tracker service for a workspace */
    getIssueTracker: (workspaceId: string) => IIssueTrackerService | undefined;
}
/**
 * RepositoryRouter handles all repository routing logic including:
 * - Multi-priority routing (labels, projects, teams)
 * - Issue-to-repository caching
 * - Repository selection UI via Linear elicitation
 * - Selection response handling
 *
 * This class was extracted from EdgeWorker to improve modularity and testability.
 */
export declare class RepositoryRouter {
    private deps;
    /** Cache mapping issue IDs to selected repository IDs */
    private issueRepositoryCache;
    /** Pending repository selections awaiting user response */
    private pendingSelections;
    constructor(deps: RepositoryRouterDeps);
    /**
     * Get cached repository for an issue
     *
     * This is a simple cache lookup used by agentSessionPrompted webhooks (Branch 3).
     * Per CLAUDE.md: "The repository will be retrieved from the issue-to-repository
     * cache - no new routing logic is performed."
     *
     * @param issueId The Linear issue ID
     * @param repositoriesMap Map of repository IDs to configurations
     * @returns The cached repository or null if not found
     */
    getCachedRepository(issueId: string, repositoriesMap: Map<string, RepositoryConfig>): RepositoryConfig | null;
    /**
     * Determine repository for webhook using multi-priority routing:
     * Priority 0: Existing active sessions
     * Priority 1: Description tag (explicit [repo=...] in issue description)
     * Priority 2: Routing labels
     * Priority 3: Project-based routing
     * Priority 4: Team-based routing
     * Priority 5: Catch-all repositories
     */
    determineRepositoryForWebhook(webhook: AgentSessionCreatedWebhook, repos: RepositoryConfig[]): Promise<RepositoryRoutingResult>;
    /**
     * Find repository by routing labels
     */
    private findRepositoryByLabels;
    /**
     * Find repository by description tag
     *
     * Parses the issue description for a [repo=...] tag and matches against:
     * - Repository GitHub URL (contains org/repo-name)
     * - Repository name
     * - Repository ID
     *
     * Example tags:
     * - [repo=Trelent/lighthouse-financial-disclosure]
     * - [repo=my-repo-name]
     */
    private findRepositoryByDescriptionTag;
    /**
     * Parse [repo=...] tag from issue description
     *
     * Supports various formats:
     * - [repo=org/repo-name]
     * - [repo=repo-name]
     * - [repo=repo-id]
     *
     * Also handles escaped brackets (\\[repo=...\\]) which Linear may produce
     * when the description contains markdown-escaped square brackets.
     *
     * Returns the tag value or null if not found.
     */
    parseRepoTagFromDescription(description: string): string | null;
    /**
     * Find repository by team key
     */
    private findRepositoryByTeamKey;
    /**
     * Find repository by project name
     */
    private findRepositoryByProject;
    /**
     * Elicit user repository selection - post elicitation to Linear
     */
    elicitUserRepositorySelection(webhook: AgentSessionCreatedWebhook, workspaceRepos: RepositoryConfig[]): Promise<void>;
    /**
     * Post error activity when repository selection fails
     */
    private postRepositorySelectionError;
    /**
     * Select repository from user response
     * Returns the selected repository or null if webhook should not be processed further
     */
    selectRepositoryFromResponse(agentSessionId: string, selectedRepositoryName: string): Promise<RepositoryConfig | null>;
    /**
     * Check if there's a pending repository selection for this agent session
     */
    hasPendingSelection(agentSessionId: string): boolean;
    /**
     * Extract issue information from webhook
     */
    private extractIssueInfo;
    /**
     * Type guard for entity webhooks (Issue, Comment, etc.)
     */
    private isEntityWebhook;
    /**
     * Type guards
     */
    private isAgentSessionCreatedWebhook;
    private isAgentSessionPromptedWebhook;
    /**
     * Get issue repository cache for serialization
     */
    getIssueRepositoryCache(): Map<string, string>;
    /**
     * Restore issue repository cache from serialization
     */
    restoreIssueRepositoryCache(cache: Map<string, string>): void;
}
//# sourceMappingURL=RepositoryRouter.d.ts.map