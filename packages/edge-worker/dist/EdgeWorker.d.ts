import { EventEmitter } from "node:events";
import type { CyrusAgentSession, EdgeWorkerConfig, Issue, RepositoryConfig, SerializableEdgeWorkerState } from "cyrus-core";
import { AgentSessionManager } from "./AgentSessionManager.js";
import { RepositoryRouter } from "./RepositoryRouter.js";
import type { EdgeWorkerEvents } from "./types.js";
export declare interface EdgeWorker {
    on<K extends keyof EdgeWorkerEvents>(event: K, listener: EdgeWorkerEvents[K]): this;
    emit<K extends keyof EdgeWorkerEvents>(event: K, ...args: Parameters<EdgeWorkerEvents[K]>): boolean;
}
/**
 * Unified edge worker that **orchestrates**
 *   capturing Linear webhooks,
 *   managing Claude Code processes, and
 *   processes results through to Linear Agent Activity Sessions
 */
export declare class EdgeWorker extends EventEmitter {
    private config;
    private repositories;
    private agentSessionManagers;
    private issueTrackers;
    private linearEventTransport;
    private cliRPCServer;
    private configUpdater;
    private persistenceManager;
    private sharedApplicationServer;
    private cyrusHome;
    private childToParentAgentSession;
    private procedureAnalyzer;
    private configWatcher?;
    private configPath?;
    /** @internal - Exposed for testing only */
    repositoryRouter: RepositoryRouter;
    private gitService;
    private activeWebhookCount;
    /** Handler for AskUserQuestion tool invocations via Linear select signal */
    private askUserQuestionHandler;
    /** User access control for whitelisting/blacklisting Linear users */
    private userAccessControl;
    constructor(config: EdgeWorkerConfig);
    /**
     * Start the edge worker
     */
    start(): Promise<void>;
    /**
     * Initialize and register components (routes) before server starts
     */
    private initializeComponents;
    /**
     * Register the /status endpoint for checking if the process is busy or idle
     * This endpoint is used to determine if the process can be safely restarted
     */
    private registerStatusEndpoint;
    /**
     * Register the /version endpoint for CLI version information
     * This endpoint is used by dashboards to display the installed CLI version
     */
    private registerVersionEndpoint;
    /**
     * Compute the current status of the Cyrus process
     * @returns "idle" if the process can be safely restarted, "busy" if work is in progress
     */
    private computeStatus;
    /**
     * Stop the edge worker
     */
    stop(): Promise<void>;
    /**
     * Set the config file path for dynamic reloading
     */
    setConfigPath(configPath: string): void;
    /**
     * Handle resuming a parent session when a child session completes
     * This is the core logic used by the resume parent session callback
     * Extracted to reduce duplication between constructor and addNewRepositories
     */
    private handleResumeParentSession;
    /**
     * Handle subroutine transition when a subroutine completes
     * This is triggered by the AgentSessionManager's 'subroutineComplete' event
     */
    private handleSubroutineTransition;
    /**
     * Handle validation loop fixer - run the fixer prompt
     */
    private handleValidationLoopFixer;
    /**
     * Handle validation loop rerun - re-run the verifications subroutine
     */
    private handleValidationLoopRerun;
    /**
     * Start watching config file for changes
     */
    private startConfigWatcher;
    /**
     * Handle configuration file changes
     */
    private handleConfigChange;
    /**
     * Safely load configuration from file with validation
     */
    private loadConfigSafely;
    /**
     * Detect changes between current and new repository configurations
     */
    private detectRepositoryChanges;
    /**
     * Deep equality check for repository configs
     */
    private deepEqual;
    /**
     * Add new repositories to the running EdgeWorker
     */
    private addNewRepositories;
    /**
     * Update existing repositories
     */
    private updateModifiedRepositories;
    /**
     * Remove deleted repositories
     */
    private removeDeletedRepositories;
    /**
     * Handle errors
     */
    private handleError;
    /**
     * Get cached repository for an issue (used by agentSessionPrompted Branch 3)
     */
    private getCachedRepository;
    /**
     * Handle webhook events from proxy - main router for all webhooks
     */
    private handleWebhook;
    /**
     * Handle issue unassignment webhook
     */
    private handleIssueUnassignedWebhook;
    /**
     * Handle issue content update webhook (title, description, or attachments).
     *
     * When the title, description, or attachments of an issue are updated, this handler feeds
     * the changes into any active session for that issue, allowing the AI to
     * compare old vs new values and decide whether to take action.
     *
     * The prompt uses XML-style formatting to clearly show what changed:
     * - <issue_update> wrapper with timestamp and issue identifier
     * - <title_change> with <old_title> and <new_title> if title changed
     * - <description_change> with <old_description> and <new_description> if description changed
     * - <attachments_change> with <old_attachments> and <new_attachments> if attachments changed
     * - <guidance> section instructing the agent to evaluate whether changes affect its work
     *
     * @see https://studio.apollographql.com/public/Linear-Webhooks/variant/current/schema/reference/objects/EntityWebhookPayload
     * @see https://studio.apollographql.com/public/Linear-Webhooks/variant/current/schema/reference/objects/IssueWebhookPayload
     * @see https://studio.apollographql.com/public/Linear-Webhooks/variant/current/schema/reference/unions/DataWebhookPayload
     */
    private handleIssueContentUpdate;
    /**
     * Build an XML-formatted prompt for issue content updates (title, description, attachments).
     *
     * The prompt clearly shows what fields changed by comparing old vs new values,
     * and includes guidance for the agent to evaluate whether these changes affect
     * its current implementation or action plan.
     */
    private buildIssueUpdatePrompt;
    /**
     * Get issue tracker for a workspace by finding first repository with that workspace ID
     */
    private getIssueTrackerForWorkspace;
    /**
     * Create a new Linear agent session with all necessary setup
     * @param linearAgentActivitySessionId The Linear agent activity session ID
     * @param issue Linear issue object
     * @param repository Repository configuration
     * @param agentSessionManager Agent session manager instance
     * @returns Object containing session details and setup information
     */
    private createLinearAgentSession;
    /**
     * Handle agent session created webhook
     * Can happen due to being 'delegated' or @ mentioned in a new thread
     * @param webhook The agent session created webhook
     * @param repos All available repositories for routing
     */
    private handleAgentSessionCreatedWebhook;
    /**

    /**
     * Initialize and start agent runner for an agent session
     * This method contains the shared logic for creating an agent runner that both
     * handleAgentSessionCreatedWebhook and handleUserPromptedAgentActivity use.
     *
     * @param agentSession The Linear agent session
     * @param repository The repository configuration
     * @param guidance Optional guidance rules from Linear
     * @param commentBody Optional comment body (for mentions)
     */
    private initializeAgentRunner;
    /**
     * Handle stop signal from prompted webhook
     * Branch 1 of agentSessionPrompted (see packages/CLAUDE.md)
     *
     * IMPORTANT: Stop signals do NOT require repository lookup.
     * The session must already exist (per CLAUDE.md), so we search
     * all agent session managers to find it.
     */
    private handleStopSignal;
    /**
     * Handle repository selection response from prompted webhook
     * Branch 2 of agentSessionPrompted (see packages/CLAUDE.md)
     *
     * This method extracts the user's repository selection from their response,
     * or uses the fallback repository if their message doesn't match any option.
     * In both cases, the selected repository is cached for future use.
     */
    private handleRepositorySelectionResponse;
    /**
     * Handle AskUserQuestion response from prompted webhook
     * Branch 2.5: User response to a question posed via AskUserQuestion tool
     *
     * @param webhook The prompted webhook containing user's response
     */
    private handleAskUserQuestionResponse;
    /**
     * Handle normal prompted activity (existing session continuation)
     * Branch 3 of agentSessionPrompted (see packages/CLAUDE.md)
     */
    private handleNormalPromptedActivity;
    /**
     * Handle user-prompted agent activity webhook
     * Implements three-branch architecture from packages/CLAUDE.md:
     *   1. Stop signal - terminate existing runner
     *   2. Repository selection response - initialize Claude runner for first time
     *   3. Normal prompted activity - continue existing session or create new one
     *
     * @param webhook The prompted webhook containing user's message
     */
    private handleUserPromptedAgentActivity;
    /**
     * Handle issue unassignment
     * @param issue Linear issue object from webhook data
     * @param repository Repository configuration
     */
    private handleIssueUnassigned;
    /**
     * Handle Claude messages
     */
    private handleClaudeMessage;
    /**
     * Handle Claude session error
     * Silently ignores AbortError (user-initiated stop), logs other errors
     */
    private static readonly MAX_CRASH_RETRIES;
    private static readonly CRASH_RETRY_DELAY_MS;
    private handleClaudeError;
    /**
     * Handle runner crash by attempting automatic recovery.
     * Follows the same pattern as "resume-failed" stale session recovery.
     *
     * Guards:
     * - Skips if session is already in terminal state (Error/Complete with wasRunning=false)
     * - Skips if max retries exceeded
     * - Skips if AbortError or SIGTERM (graceful shutdown)
     */
    private handleRunnerCrashRecovery;
    /**
     * Fetch issue labels for a given issue
     */
    private fetchIssueLabels;
    /**
     * Determine runner type and model from issue labels.
     * Returns the runner type ("claude" or "gemini"), optional model override, and fallback model.
     *
     * Label priority (case-insensitive):
     * - Gemini labels: gemini, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite, gemini-3-pro, gemini-3-pro-preview
     * - Claude labels: claude, sonnet, opus
     *
     * If no runner label is found, defaults to claude.
     */
    private determineRunnerFromLabels;
    /**
     * Determine system prompt based on issue labels and repository configuration
     */
    private determineSystemPromptFromLabels;
    /**
     * Build simplified prompt for label-based workflows
     * @param issue Full Linear issue
     * @param repository Repository configuration
     * @param attachmentManifest Optional attachment manifest
     * @param guidance Optional agent guidance rules from Linear
     * @returns Formatted prompt string
     */
    private buildLabelBasedPrompt;
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
    private generateRoutingContext;
    /**
     * Build prompt for mention-triggered sessions
     * @param issue Full Linear issue object
     * @param repository Repository configuration
     * @param agentSession The agent session containing the mention
     * @param attachmentManifest Optional attachment manifest to append
     * @param guidance Optional agent guidance rules from Linear
     * @returns The constructed prompt and optional version tag
     */
    private buildMentionPrompt;
    /**
     * Extract version tag from template content
     * @param templateContent The template content to parse
     * @returns The version value if found, undefined otherwise
     */
    private extractVersionTag;
    /**
     * Format agent guidance rules as markdown for injection into prompts
     * @param guidance Array of guidance rules from Linear
     * @returns Formatted markdown string with guidance, or empty string if no guidance
     */
    private formatAgentGuidance;
    /**
     * Determine the base branch for an issue, considering parent issues and blocked-by relationships
     *
     * Priority order:
     * 1. If issue has graphite label AND has a "blocked by" relationship, use the blocking issue's branch
     *    (This enables Graphite stacking where each sub-issue branches off the previous)
     * 2. If issue has a parent, use the parent's branch
     * 3. Fall back to repository's default base branch
     */
    private determineBaseBranch;
    /**
     * Convert full Linear SDK issue to CoreIssue interface for Session creation
     */
    private convertLinearIssueToCore;
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
    private fetchBlockingIssues;
    /**
     * Check if an issue has the graphite label
     *
     * @param issue The issue to check
     * @param repository The repository configuration
     * @returns True if the issue has the graphite label
     */
    private hasGraphiteLabel;
    /**
     * Format Linear comments into a threaded structure that mirrors the Linear UI
     * @param comments Array of Linear comments
     * @returns Formatted string showing comment threads
     */
    private formatCommentThreads;
    /**
     * Build a prompt for Claude using the improved XML-style template
     * @param issue Full Linear issue
     * @param repository Repository configuration
     * @param newComment Optional new comment to focus on (for handleNewRootComment)
     * @param attachmentManifest Optional attachment manifest
     * @param guidance Optional agent guidance rules from Linear
     * @returns Formatted prompt string
     */
    private buildIssueContextPrompt;
    /**
     * Get connection status by repository ID
     */
    getConnectionStatus(): Map<string, boolean>;
    /**
     * Get event transport (for testing purposes)
     * @internal
     */
    _getClientByToken(_token: string): any;
    /**
     * Start OAuth flow using the shared application server
     */
    startOAuthFlow(proxyUrl?: string): Promise<{
        linearToken: string;
        linearWorkspaceId: string;
        linearWorkspaceName: string;
    }>;
    /**
     * Get the server port
     */
    getServerPort(): number;
    /**
     * Get the OAuth callback URL
     */
    getOAuthCallbackUrl(): string;
    /**
     * Move issue to started state when assigned
     * @param issue Full Linear issue object from Linear SDK
     * @param repositoryId Repository ID for issue tracker lookup
     */
    private moveIssueToStartedState;
    /**
     * Post initial comment when assigned to issue
     */
    /**
     * Post a comment to Linear
     */
    private postComment;
    /**
     * Format todos as Linear checklist markdown
     */
    /**
     * Extract attachment URLs from text (issue description or comment)
     */
    private extractAttachmentUrls;
    /**
     * Download attachments from Linear issue
     * @param issue Linear issue object from webhook data
     * @param repository Repository configuration
     * @param workspacePath Path to workspace directory
     */
    private downloadIssueAttachments;
    /**
     * Download a single attachment from Linear
     */
    private downloadAttachment;
    /**
     * Download attachments from a specific comment
     * @param commentBody The body text of the comment
     * @param attachmentsDir Directory where attachments should be saved
     * @param linearToken Linear API token
     * @param existingAttachmentCount Current number of attachments already downloaded
     */
    private downloadCommentAttachments;
    /**
     * Count existing images in the attachments directory
     */
    private countExistingImages;
    /**
     * Generate attachment manifest for new comment attachments
     */
    private generateNewAttachmentManifest;
    /**
     * Generate a markdown section describing downloaded attachments
     */
    private generateAttachmentManifest;
    /**
     * Build MCP configuration with automatic Linear server injection and inline cyrus tools
     */
    private buildMcpConfig;
    /**
     * Resolve tool preset names to actual tool lists
     */
    private resolveToolPreset;
    /**
     * Build the complete prompt for a session - shows full prompt assembly in one place
     *
     * New session prompt structure:
     * 1. Issue context (from buildIssueContextPrompt)
     * 2. Initial subroutine prompt (if procedure initialized)
     * 3. User comment
     *
     * Existing session prompt structure:
     * 1. User comment
     * 2. Attachment manifest (if present)
     */
    private buildSessionPrompt;
    /**
     * Assemble a complete prompt - unified entry point for all prompt building
     * This method contains all prompt assembly logic in one place
     */
    private assemblePrompt;
    /**
     * Build prompt for actively streaming session - pass through user comment as-is
     */
    private buildStreamingPrompt;
    /**
     * Build prompt for new session - includes issue context, subroutine prompt, and user comment
     */
    private buildNewSessionPrompt;
    /**
     * Build prompt for existing session continuation - user comment and attachments only
     */
    private buildContinuationPrompt;
    /**
     * Determine the prompt type based on input flags and system prompt availability
     */
    private determinePromptType;
    /**
     * Load a subroutine prompt file
     * Extracted helper to make prompt assembly more readable
     */
    private loadSubroutinePrompt;
    /**
     * Load shared instructions that get appended to all system prompts
     */
    private loadSharedInstructions;
    /**
     * Adapter method for prompt assembly - extracts just the prompt string
     */
    private determineSystemPromptForAssembly;
    /**
     * Adapter method for prompt assembly - routes to appropriate issue context builder
     */
    private buildIssueContextForPromptAssembly;
    /**
     * Build agent runner configuration with common settings.
     * Also determines which runner type to use based on labels.
     * @returns Object containing the runner config and runner type to use
     */
    private buildAgentRunnerConfig;
    /**
     * Create an onAskUserQuestion callback for the ClaudeRunner.
     * This callback delegates to the AskUserQuestionHandler which posts
     * elicitations to Linear and waits for user responses.
     *
     * @param linearAgentSessionId - Linear agent session ID for tracking
     * @param organizationId - Linear organization/workspace ID
     */
    private createAskUserQuestionCallback;
    /**
     * Build disallowed tools list following the same hierarchy as allowed tools
     */
    private buildDisallowedTools;
    /**
     * Merge subroutine-level disallowedTools with base disallowedTools
     * @param session Current agent session
     * @param baseDisallowedTools Base disallowed tools from repository/global config
     * @param logContext Context string for logging (e.g., "EdgeWorker", "resumeClaudeSession")
     * @returns Merged disallowed tools list
     */
    private mergeSubroutineDisallowedTools;
    /**
     * Build allowed tools list with Linear MCP tools automatically included
     */
    private buildAllowedTools;
    /**
     * Get Agent Sessions for an issue
     */
    getAgentSessionsForIssue(issueId: string, repositoryId: string): any[];
    /**
     * Check if the user who triggered the webhook is allowed to interact.
     * @param webhook The webhook containing user information
     * @param repository The repository configuration
     * @returns Access check result with allowed status and user name
     */
    private checkUserAccess;
    /**
     * Handle blocked user according to configured behavior.
     * Posts a response activity to end the session.
     * @param webhook The webhook that triggered the blocked access
     * @param repository The repository configuration
     * @param _reason The reason for blocking (for logging)
     */
    private handleBlockedUser;
    /**
     * Load persisted EdgeWorker state for all repositories
     */
    private loadPersistedState;
    /**
     * Save current EdgeWorker state for all repositories
     */
    private savePersistedState;
    /**
     * Resume sessions that were interrupted by a crash/restart
     * Looks for sessions with wasRunning === true and no active runner
     */
    private resumeInterruptedSessions;
    /**
     * Serialize EdgeWorker mappings to a serializable format
     */
    serializeMappings(): SerializableEdgeWorkerState;
    /**
     * Restore EdgeWorker mappings from serialized state
     */
    restoreMappings(state: SerializableEdgeWorkerState): void;
    /**
     * Post instant acknowledgment thought when agent session is created
     */
    private postInstantAcknowledgment;
    /**
     * Post parent resume acknowledgment thought when parent session is resumed from child
     */
    private postParentResumeAcknowledgment;
    /**
     * Post repository selection activity to Linear
     * Shows which method was used to select the repository (auto-routing or user selection)
     */
    private postRepositorySelectionActivity;
    /**
     * Re-route procedure for a session (used when resuming from child or give feedback)
     * This ensures the currentSubroutine is reset to avoid suppression issues
     */
    private rerouteProcedureForSession;
    /**
     * Handle prompt with streaming check - centralized logic for all input types
     *
     * This method implements the unified pattern for handling prompts:
     * 1. Check if runner is actively streaming
     * 2. Route procedure if NOT streaming (resets currentSubroutine)
     * 3. Add to stream if streaming, OR resume session if not
     *
     * @param session The Cyrus agent session
     * @param repository Repository configuration
     * @param linearAgentActivitySessionId Linear agent activity session ID
     * @param agentSessionManager Agent session manager instance
     * @param promptBody The prompt text to send
     * @param attachmentManifest Optional attachment manifest to append
     * @param isNewSession Whether this is a new session
     * @param additionalAllowedDirs Additional directories to allow access to
     * @param logContext Context string for logging (e.g., "prompted webhook", "parent resume")
     * @returns true if message was added to stream, false if session was resumed
     */
    private handlePromptWithStreamingCheck;
    /**
     * Post thought about system prompt selection based on labels
     */
    private postSystemPromptSelectionThought;
    /**
     * Resume or create an Agent session with the given prompt
     * This is the core logic for handling prompted agent activities
     * @param session The Cyrus agent session
     * @param repository The repository configuration
     * @param linearAgentActivitySessionId The Linear agent session ID
     * @param agentSessionManager The agent session manager
     * @param promptBody The prompt text to send
     * @param attachmentManifest Optional attachment manifest
     * @param isNewSession Whether this is a new session
     */
    resumeAgentSession(session: CyrusAgentSession, repository: RepositoryConfig, linearAgentActivitySessionId: string, agentSessionManager: AgentSessionManager, promptBody: string, attachmentManifest?: string, isNewSession?: boolean, additionalAllowedDirectories?: string[], maxTurns?: number, commentAuthor?: string, commentTimestamp?: string): Promise<void>;
    /**
     * Post instant acknowledgment thought when receiving prompted webhook
     */
    private postInstantPromptedAcknowledgment;
    /**
     * Fetch complete issue details from Linear API
     */
    fetchFullIssueDetails(issueId: string, repositoryId: string): Promise<Issue | null>;
    /**
     * Build OAuth config for LinearIssueTrackerService.
     * Returns undefined if OAuth credentials are not available.
     */
    private buildOAuthConfig;
    /**
     * Save OAuth tokens to config.json
     */
    private saveOAuthTokens;
}
//# sourceMappingURL=EdgeWorker.d.ts.map