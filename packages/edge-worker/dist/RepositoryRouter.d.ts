import { type AgentSessionCreatedWebhook, type AgentSessionPromptedWebhook, type IIssueTrackerService, type ILogger, type RepositoryConfig } from "cyrus-core";
/**
 * Repository routing result types
 */
export type RepositoryRoutingResult = {
    type: "selected";
    repositories: RepositoryConfig[];
    /** Per-repo base branch overrides from [repo=name#branch] syntax */
    baseBranchOverrides?: Map<string, string>;
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
    /** Cache mapping issue IDs to selected repository IDs (array for multi-repo) */
    private issueRepositoryCache;
    /** Pending repository selections awaiting user response */
    private pendingSelections;
    private logger;
    constructor(deps: RepositoryRouterDeps, logger?: ILogger);
    /**
     * Get cached repositories for an issue
     *
     * This is a simple cache lookup used by agentSessionPrompted webhooks (Branch 3).
     * Per CLAUDE.md: "The repository will be retrieved from the issue-to-repository
     * cache - no new routing logic is performed."
     *
     * @param issueId The Linear issue ID
     * @param repositoriesMap Map of repository IDs to configurations
     * @returns The cached repositories array, or null if not found
     */
    getCachedRepositories(issueId: string, repositoriesMap: Map<string, RepositoryConfig>): RepositoryConfig[] | null;
    /**
     * Determine repositories for webhook using multi-priority routing:
     * Priority 0: Existing active sessions
     * Priority 1: Description tag (explicit [repo=...] in issue description)
     * Priority 2: Routing labels
     * Priority 3: Project-based routing
     * Priority 4: Team-based routing
     * Priority 5: Catch-all repositories
     *
     * Description-tag and label-based routing, when matched, skip lower-priority routing.
     * If no routing matches, returns needs_selection (no default assignment).
     */
    determineRepositoryForWebhook(webhook: AgentSessionCreatedWebhook | AgentSessionPromptedWebhook, repos: RepositoryConfig[]): Promise<RepositoryRoutingResult>;
    /**
     * Find all repositories matching routing labels
     */
    private findRepositoriesByLabels;
    /**
     * Find all repositories matching description tags
     *
     * Parses the issue description for repo tags and matches against:
     * - Repository GitHub URL (endsWith /repo-name)
     * - Repository name
     * - Repository ID
     *
     * Supported tag syntaxes:
     * - [repo=my-repo-name] or [repo=my-repo-name#branch]
     * - repo=frontend,backend#branch
     * - repos=frontend,backend
     */
    private findRepositoriesByDescriptionTag;
    /**
     * Parse repo tags from issue description
     *
     * Supported syntaxes:
     * - `[repo=name]` or `[repo=name#branch]` — bracketed, single repo per tag
     * - `repo=name,name2#branch` — unbracketed, comma-separated repos with optional branch
     * - `repos=name,name2#branch` — same as above with plural "repos"
     *
     * Also handles escaped brackets (\\[repo=...\\]) which Linear may produce.
     *
     * Returns array of parsed tags with optional branch overrides.
     */
    parseRepoTagsFromDescription(description: string): {
        repo: string;
        branch?: string;
    }[];
    /**
     * Parse a repo value that may contain commas (multiple repos) and #branch.
     * The #branch suffix applies to all repos in a comma-separated list.
     */
    private parseRepoValue;
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
    getIssueRepositoryCache(): Map<string, string[]>;
    /**
     * Restore issue repository cache from serialization.
     * Handles migration from old format (Map<string, string>) by wrapping values in arrays.
     */
    restoreIssueRepositoryCache(cache: Map<string, string | string[]>): void;
}
//# sourceMappingURL=RepositoryRouter.d.ts.map