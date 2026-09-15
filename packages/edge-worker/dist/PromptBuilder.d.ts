import { type BaseBranchResolution, type Comment, type GuidanceRule, type IIssueTrackerService, type ILogger, type Issue, type IssueMinimal, type RepositoryConfig, type WebhookAgentSession, type WebhookComment } from "cyrus-core";
import type { GitService } from "./GitService.js";
/**
 * Dependencies required by the PromptBuilder
 */
export interface PromptBuilderDeps {
    logger: ILogger;
    repositories: Map<string, RepositoryConfig>;
    issueTrackers: Map<string, IIssueTrackerService>;
    gitService: GitService;
}
/**
 * System prompt result from label-based determination
 */
export interface SystemPromptResult {
    prompt: string;
    version?: string;
    type?: "debugger" | "builder" | "scoper" | "orchestrator" | "graphite-orchestrator";
}
/**
 * Result from building a prompt (prompt text + optional version)
 */
export interface PromptResult {
    prompt: string;
    version?: string;
}
/**
 * Responsible for building various prompt types used in the EdgeWorker.
 *
 * Extracted from EdgeWorker to improve separation of concerns.
 * Handles label-based prompts, mention prompts, issue context prompts,
 * issue update prompts, and related utilities.
 */
export declare class PromptBuilder {
    private readonly logger;
    private readonly repositories;
    private readonly issueTrackers;
    private readonly gitService;
    constructor(deps: PromptBuilderDeps);
    /**
     * Determine system prompt based on issue labels and repository configurations.
     *
     * Checks `labelPrompts` config across all repos; first match wins (ordered by
     * array position). Logs a warning when subsequent repos would match a different
     * prompt type (conflict detection).
     */
    determineSystemPromptFromLabels(labels: string[], repositories: RepositoryConfig[]): Promise<SystemPromptResult | undefined>;
    /**
     * Match system prompt for a single repository's labelPrompts config.
     * Internal helper used by determineSystemPromptFromLabels.
     */
    private matchSystemPromptForRepo;
    /**
     * Build simplified prompt for label-based workflows.
     *
     * Loads prompt templates from each repo; for multi-repo sessions, merges
     * into a single prompt with per-repo sections delineated using XML tags.
     *
     * @param issue Full Linear issue
     * @param repositories Repository configurations (all repos in session)
     * @param attachmentManifest Optional attachment manifest
     * @param guidance Optional agent guidance rules from Linear
     * @returns Formatted prompt string
     */
    buildLabelBasedPrompt(issue: Issue, repositories: RepositoryConfig[], attachmentManifest?: string, guidance?: GuidanceRule[], resolvedBaseBranches?: Record<string, BaseBranchResolution>): Promise<PromptResult>;
    /**
     * Generate routing context for all configured workspaces.
     *
     * This is used by chat flows that need orchestrator-style routing context
     * but do not have a single current repository context.
     *
     * @returns XML-formatted routing context strings joined by blank lines,
     * or empty string when there is no multi-repo routing needed.
     */
    generateRoutingContextForAllWorkspaces(): string;
    /**
     * Generate routing context for orchestrator mode
     *
     * This provides the orchestrator with information about available repositories
     * and how to route sub-issues to them. The context includes:
     * - List of configured repositories in the workspace
     * - Routing rules for each repository (labels, teams, projects)
     * - Instructions on using description tags for explicit routing
     *
     * @param currentRepository The repository handling the current orchestrator issue
     * @returns XML-formatted routing context string, or empty string if no routing info available
     */
    generateRoutingContext(currentRepository: RepositoryConfig): string;
    /**
     * Build prompt for mention-triggered sessions
     * @param issue Full Linear issue object
     * @param agentSession The agent session containing the mention
     * @param attachmentManifest Optional attachment manifest to append
     * @param guidance Optional agent guidance rules from Linear
     * @returns The constructed prompt and optional version tag
     */
    buildMentionPrompt(issue: Issue, agentSession: WebhookAgentSession, attachmentManifest?: string, guidance?: GuidanceRule[]): Promise<PromptResult>;
    /**
     * Build a prompt for Claude using the improved XML-style template.
     *
     * Uses each repo's `promptTemplatePath` for its own section; for multi-repo
     * sessions, includes context from all repositories with per-repo XML sections.
     *
     * @param issue Full Linear issue
     * @param repositories Repository configurations (all repos in session)
     * @param newComment Optional new comment to focus on (for handleNewRootComment)
     * @param attachmentManifest Optional attachment manifest
     * @param guidance Optional agent guidance rules from Linear
     * @returns Formatted prompt string
     */
    buildIssueContextPrompt(issue: Issue, repositories: RepositoryConfig[], newComment?: WebhookComment, attachmentManifest?: string, guidance?: GuidanceRule[], resolvedBaseBranches?: Record<string, BaseBranchResolution>, workspaceRepoPaths?: Record<string, string>): Promise<PromptResult>;
    /**
     * Build XML-formatted prompt for issue content updates (title/description/attachments)
     *
     * The prompt clearly shows what fields changed by comparing old vs new values,
     * and includes guidance for the agent to evaluate whether these changes affect
     * its current implementation or action plan.
     */
    buildIssueUpdatePrompt(issueIdentifier: string, issueData: {
        title: string;
        description?: string | null;
        attachments?: unknown;
    }, updatedFrom: {
        title?: string;
        description?: string;
        attachments?: unknown;
    }): string;
    /**
     * Format Linear comments into a threaded structure that mirrors the Linear UI
     * @param comments Array of Linear comments
     * @returns Formatted string showing comment threads
     */
    formatCommentThreads(comments: Comment[]): Promise<string>;
    /**
     * Format agent guidance rules as markdown for injection into prompts
     * @param guidance Array of guidance rules from Linear
     * @returns Formatted markdown string with guidance, or empty string if no guidance
     */
    formatAgentGuidance(guidance?: GuidanceRule[]): string;
    /**
     * Extract version tag from template content
     * @param templateContent The template content to parse
     * @returns The version value if found, undefined otherwise
     */
    extractVersionTag(templateContent: string): string | undefined;
    /**
     * Resolve a GitHub user ID (numeric string from Linear) to a GitHub username.
     * Uses the public GitHub REST API: GET https://api.github.com/user/{id}
     * @param gitHubUserId The numeric GitHub user ID from Linear's gitHubUserId field
     * @returns The GitHub username (login), or undefined if resolution fails
     */
    resolveGitHubUsername(gitHubUserId: string): Promise<string | undefined>;
    /**
     * Load shared instructions that get appended to all system prompts
     */
    loadSharedInstructions(): Promise<string>;
    /**
     * Determine the base branch for an issue across all repositories.
     *
     * Returns a Map from repositoryId to baseBranch. Each repo may have
     * different base branches and Graphite stacking relationships.
     *
     * If resolvedBaseBranches is provided (from workspace creation), those values
     * are used directly without re-resolving. This eliminates redundant graphite/parent
     * lookups since the GitService already performed that resolution.
     *
     * Priority order (per repo, when resolving):
     * 1. Pre-resolved value from workspace (if available)
     * 2. If issue has graphite label AND has a "blocked by" relationship, use the blocking issue's branch
     * 3. If issue has a parent, use the parent's branch
     * 4. Fall back to repository's default base branch
     */
    determineBaseBranch(issue: Issue, repositories: RepositoryConfig[], resolvedBaseBranches?: Record<string, BaseBranchResolution>): Promise<Map<string, string>>;
    /**
     * Determine the base branch for a single repository.
     * Internal helper used by determineBaseBranch.
     */
    private determineBaseBranchForRepo;
    /**
     * Check if an issue has the graphite label defined in any repository's labelPrompts.graphite config
     *
     * @param issue The issue to check
     * @param repositories The repository configurations to check
     * @returns True if the issue has the graphite label in any repo
     */
    hasGraphiteLabel(issue: Issue, repositories: RepositoryConfig[]): Promise<boolean>;
    /**
     * Fetch issues that block this issue (i.e., issues this one is "blocked by")
     * Uses the inverseRelations field with type "blocks"
     *
     * Linear relations work like this:
     * - When Issue A "blocks" Issue B, a relation is created with:
     *   - issue = A (the blocker)
     *   - relatedIssue = B (the blocked one)
     *   - type = "blocks"
     *
     * So to find "who blocks Issue B", we need inverseRelations (where B is the relatedIssue)
     * and look for type === "blocks", then get the `issue` field (the blocker).
     *
     * @param issue The issue to fetch blocking issues for
     * @returns Array of issues that block this one, or empty array if none
     */
    fetchBlockingIssues(issue: Issue): Promise<Issue[]>;
    /**
     * Convert full Linear SDK issue to CoreIssue interface for Session creation
     */
    convertLinearIssueToCore(issue: Issue): IssueMinimal;
    /**
     * Fetch issue labels for a given issue
     */
    fetchIssueLabels(issue: Issue): Promise<string[]>;
}
//# sourceMappingURL=PromptBuilder.d.ts.map