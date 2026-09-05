import { EventEmitter } from "node:events";
import type { CyrusAgentSession, EdgeWorkerConfig, Issue, RepositoryConfig, SerializableEdgeWorkerState } from "cyrus-core";
import { type SlackWebhookEvent } from "cyrus-slack-event-transport";
import { AgentSessionManager } from "./AgentSessionManager.js";
import { RepositoryRouter } from "./RepositoryRouter.js";
import { SharedApplicationServer } from "./SharedApplicationServer.js";
import type { EdgeWorkerEvents } from "./types.js";
/**
 * A session ends a turn with this as its leading text to decline the automatic
 * GitHub reply for that turn. Sessions that post their own PR output, or that
 * end a turn only to wait on dispatched work, use it so the wait does not
 * become a comment. An HTML comment so it stays invisible if one slips through.
 */
export declare const GITHUB_NO_REPLY_MARKER = "<!-- cyrus:no-reply -->";
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
    private agentSessionManager;
    private activitySinks;
    private sessionRepositories;
    private lastStopTimeBySession;
    private warmInstances;
    private issueTrackers;
    private linearEventTransport;
    private gitHubEventTransport;
    private gitHubAppTokenProvider;
    private gitLabEventTransport;
    private slackEventTransport;
    private chatSessionHandler;
    private gitHubCommentService;
    private gitLabCommentService;
    private cliRPCServer;
    private configUpdater;
    private persistenceManager;
    private sharedApplicationServer;
    private cyrusHome;
    private globalSessionRegistry;
    private configPath?;
    /** @internal - Exposed for testing only */
    repositoryRouter: RepositoryRouter;
    private gitService;
    private activeWebhookCount;
    private activeGitHubPrSessions;
    private queuedGitHubPrEvents;
    /** Handler for AskUserQuestion tool invocations via Linear select signal */
    private askUserQuestionHandler;
    /** User access control for whitelisting/blacklisting Linear users */
    private userAccessControl;
    private logger;
    private attachmentService;
    private runnerSelectionService;
    private toolPermissionResolver;
    private mcpConfigService;
    private runnerConfigBuilder;
    private activityPoster;
    private configManager;
    private promptBuilder;
    private defaultSkillsDeployer;
    private skillsPluginResolver;
    private readonly cyrusToolsMcpEndpoint;
    private cyrusToolsMcpRegistered;
    private cyrusToolsMcpRequestContext;
    private cyrusToolsMcpSessions;
    /** Validates webhook source IPs against known provider allowlists */
    private webhookIpValidator;
    /** Egress proxy for sandbox network traffic filtering and header injection */
    private egressProxy;
    /** Base SDK sandbox settings to pass to ClaudeRunner sessions (set when proxy starts) */
    private sdkSandboxSettings;
    /** CA cert path for MITM TLS termination (passed per-session env, not process.env) */
    private egressCaCertPath;
    /**
     * Remote SessionStore that mirrors Claude SDK transcripts to the Cyrus
     * hosted control plane. Enabled when all three of `CYRUS_APP_URL`,
     * `CYRUS_API_KEY`, and `CYRUS_TEAM_ID` are set — used by any Claude
     * runner spawned from this worker so transcripts survive ephemeral
     * worktrees and are resumable from any host.
     */
    private claudeSessionStore;
    /**
     * Tracks recently processed issue-update webhook keys to prevent
     * duplicate deliveries from Linear's at-least-once delivery.
     * Key format: `${createdAt}:${issueId}`
     */
    private processedIssueUpdateKeys;
    /**
     * Sessions parked due to blocked-by dependencies.
     * Key: Linear issue ID (the blocked issue)
     * Value: All data needed to replay initializeAgentRunner when unblocked
     */
    private parkedSessions;
    /**
     * Resolve `~/` prefixes in path-bearing config fields that are otherwise
     * passed verbatim to `fs.readFileSync` (which does not expand tildes).
     * Repository-scoped paths are normalized separately in addNew /
     * updateModified; this covers the platform-level MCP config lists that
     * cyrus-hosted writes with literal `~/.cyrus/...` prefixes when
     * generating self-host config.
     */
    private static normalizeConfigPaths;
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
     * Register the GitHub event transport for receiving forwarded GitHub webhooks from CYHOST.
     * This creates a /github-webhook endpoint that handles @cyrusagent mentions on GitHub PRs.
     */
    private registerGitHubEventTransport;
    /**
     * Register the GitLab event transport for receiving forwarded GitLab webhooks.
     * This creates a /gitlab-webhook endpoint that handles note events on merge requests.
     */
    private registerGitLabEventTransport;
    /**
     * Whether Cyrus should follow plain replies in a Slack thread it was
     * @mentioned in. Enabled by default; controlled by the per-team
     * `slackThreadFollowing` config toggle (Behaviours page) and force-disabled
     * by the `CYRUS_SLACK_THREAD_FOLLOWING_DISABLED` env kill-switch, which takes
     * precedence over the toggle. When disabled, only @mentions are processed.
     */
    private isSlackThreadFollowingEnabled;
    /**
     * Register the Slack event transport for receiving forwarded Slack webhooks from CYHOST.
     * This creates a /slack-webhook endpoint that handles @mention events from Slack.
     */
    private registerSlackEventTransport;
    /**
     * Handle a GitHub webhook event (forwarded from CYHOST).
     *
     * This creates a new session for the GitHub PR comment, checks out the PR branch
     * via git worktree, and processes the comment as a task prompt.
     */
    /**
     * Resolve a GitHub API token from (in priority order):
     * 1. Forwarded installation token from CYHOST (cloud/proxy mode)
     * 2. Self-minted installation token from GitHub App credentials (self-hosted)
     * 3. Personal access token from GITHUB_TOKEN env var (fallback)
     */
    private resolveGitHubToken;
    private handleGitHubWebhook;
    private advanceGitHubPrQueue;
    /**
     * Handle GitHub push webhook events.
     * When a base branch receives new commits, find active sessions tracking that
     * branch and stream a rebase notification to the running agent.
     */
    private handleGitHubPushWebhook;
    /**
     * Find a repository configuration that matches a GitHub repository URL.
     * Matches against the githubUrl field in repository config.
     */
    private findRepositoryByGitHubUrl;
    /**
     * Fetch the PR head and base branch refs for an issue_comment webhook.
     * For issue_comment events, the branch refs are not in the payload
     * and must be fetched from the GitHub API.
     */
    private fetchPRBranchRefs;
    /**
     * Create a git worktree for a GitHub PR branch.
     * If the worktree already exists for this branch, reuse it.
     */
    private createGitHubWorkspace;
    /**
     * Build a system prompt for a GitHub PR comment session.
     */
    private buildGitHubSystemPrompt;
    /**
     * Build a system prompt for a GitHub PR change request review session.
     */
    private buildGitHubChangeRequestSystemPrompt;
    /**
     * Post a reply back to the GitHub PR comment after the session completes.
     */
    private postGitHubReply;
    /**
     * Handle an incoming GitLab webhook event (note on a merge request).
     * Mirrors the GitHub webhook handler but uses GitLab-specific utilities.
     */
    private handleGitLabWebhook;
    /**
     * Find a repository configuration that matches a GitLab project URL.
     * Matches against the gitlabUrl field in repository config.
     */
    private findRepositoryByGitLabUrl;
    /**
     * Create a git worktree for a GitLab MR branch.
     * If the worktree already exists for this branch, reuse it.
     */
    private createGitLabWorkspace;
    /**
     * Build a system prompt for a GitLab MR note session.
     */
    private buildGitLabSystemPrompt;
    /**
     * Build a system prompt for a GitLab MR change request session.
     */
    private buildGitLabChangeRequestSystemPrompt;
    /**
     * Post a reply back to the GitLab MR after the session completes.
     */
    private postGitLabReply;
    /**
     * Compute the current status of the Cyrus process
     * @returns "idle" if the process can be safely restarted, "busy" if work is in progress
     */
    private computeStatus;
    /**
     * Test-only: dispatch a synthetic Slack webhook event through the chat
     * session handler. Used by the F1 test harness to exercise the Slack →
     * ClaudeRunner code path end-to-end without a real Slack signature.
     */
    dispatchChatTestEvent(event: SlackWebhookEvent): Promise<void>;
    /**
     * Public accessor for the shared Fastify-based application server.
     * Used by F1 to register test-only routes alongside production webhook routes.
     */
    getSharedApplicationServer(): SharedApplicationServer;
    /**
     * Test-only: list active chat threads (threadKey → sessionId).
     */
    listChatThreads(): Array<{
        threadKey: string;
        sessionId: string;
    }>;
    /**
     * Test-only: fetch the last assistant text reply for a chat thread.
     * Returns null when the thread or runner is unknown, or no assistant
     * message has been produced yet.
     */
    getChatThreadLastReply(threadKey: string): {
        text: string;
        isRunning: boolean;
        messageCount: number;
    } | null;
    /**
     * Stop the edge worker
     */
    stop(): Promise<void>;
    /**
     * Apply sandbox config changes from a config reload.
     * Handles three transitions:
     * - enabled → enabled: update network policy on the running proxy
     * - disabled → enabled: start a new proxy
     * - enabled → disabled: stop the running proxy
     */
    private applySandboxConfigChanges;
    /**
     * Log instructions for trusting the egress proxy CA certificate.
     * When systemWideCert is true, logs that env vars are skipped and trust
     * is expected from the OS cert store. Otherwise logs env var list and
     * checks macOS keychain trust status.
     */
    private logCertTrustInstructions;
    /**
     * Check whether the Cyrus egress proxy CA is trusted at the OS level.
     * macOS: searches the System keychain. Linux: checks update-ca-certificates output.
     */
    private isCertTrustedSystemWide;
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
     * Detect workspace token changes and update all dependent services.
     *
     * When an OAuth token is refreshed (at least once per day), the new token is
     * persisted to config.json which triggers the file watcher.  This method
     * compares the previous in-memory tokens against the new config and calls
     * `setAccessToken()` on any affected `LinearIssueTrackerService` instances,
     * and pushes the updated workspace configs to `AttachmentService`.
     */
    private updateLinearWorkspaceTokens;
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
     * Get cached repositories for an issue (used by agentSessionPrompted Branch 3)
     * Returns null if nothing cached, or array of resolved RepositoryConfigs.
     */
    private getCachedRepositories;
    /**
     * Get first cached repository for an issue (convenience for single-repo callers)
     */
    private getCachedRepository;
    /**
     * Handle webhook events from proxy - main router for all webhooks
     */
    private handleWebhook;
    /**
     * Handle unified internal messages from the message bus.
     * This is the new entry point for processing events from all platforms.
     *
     * Note: For now, this runs in parallel with legacy webhook handlers.
     * Once migration is complete, legacy handlers will be removed.
     */
    private handleMessage;
    /**
     * Handle session start message (unified handler for session creation).
     *
     * This is a placeholder that logs the message for now.
     * TODO: Migrate logic from handleAgentSessionCreatedWebhook and handleGitHubWebhook.
     */
    private handleSessionStartMessage;
    /**
     * Handle user prompt message (unified handler for mid-session prompts).
     *
     * This is a placeholder that logs the message for now.
     * TODO: Migrate logic from handleUserPromptedAgentActivity (branch 3).
     */
    private handleUserPromptMessage;
    /**
     * Handle stop signal message (unified handler for session termination).
     *
     * This is a placeholder that logs the message for now.
     * TODO: Migrate logic from handleUserPromptedAgentActivity (branch 1).
     */
    private handleStopSignalMessage;
    /**
     * Handle content update message (unified handler for issue/PR content changes).
     *
     * This is a placeholder that logs the message for now.
     * TODO: Migrate logic from handleIssueContentUpdate.
     */
    private handleContentUpdateMessage;
    /**
     * Handle unassign message (unified handler for task unassignment).
     *
     * This is a placeholder that logs the message for now.
     * TODO: Migrate logic from handleIssueUnassignedWebhook.
     */
    private handleUnassignMessage;
    /**
     * Handle issue state change message (terminal state reached).
     * Stops active sessions and deletes worktrees for the issue.
     */
    private handleIssueStateChangeMessage;
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
    /**
     * Check if an issue has unresolved blocked-by dependencies.
     * Fetches the issue from Linear and checks its inverse relations for blocking issues
     * that haven't been completed or canceled.
     */
    private checkBlockedByDependencies;
    /**
     * Handle issue state change webhooks.
     * When a blocking issue is completed, wake up any parked sessions that were waiting on it.
     */
    private handleIssueStateChange;
    /**
     * Handle a user re-prompt on a parked (blocked-by) session.
     * Re-checks blocking status: if clear, wakes the session; if still blocked, re-posts status.
     */
    private handleParkedSessionReprompt;
    private buildIssueUpdatePrompt;
    /**
     * Get issue tracker for a workspace (direct lookup by workspace ID)
     */
    private getIssueTrackerForWorkspace;
    /**
     * Get the activity sink for a repository by looking up its workspace.
     */
    private getActivitySinkForRepo;
    /**
     * Get the Linear API token for a workspace from workspace-level config.
     */
    private getLinearTokenForWorkspace;
    /**
     * Create a new Cyrus agent session with all necessary setup
     * @param sessionId The Linear agent activity session ID
     * @param issue Linear issue object
     * @param repositories Repository configurations (primary repo is repositories[0])
     * @param agentSessionManager Agent session manager instance
     * @param linearWorkspaceId Linear workspace ID (from webhook.organizationId)
     * @returns Object containing session details and setup information
     */
    private createCyrusAgentSession;
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
     * @param repositories Repository configurations (primary repo is repositories[0])
     * @param linearWorkspaceId Linear workspace ID (from webhook.organizationId)
     * @param guidance Optional guidance rules from Linear
     * @param commentBody Optional comment body (for mentions)
     * @param baseBranchOverrides Per-repo base branch overrides from [repo=name#branch] syntax
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
     * @param linearWorkspaceId Linear workspace ID (from webhook.organizationId)
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
     * Attach a crash recovery handler to a runner's "error" event.
     * Both ClaudeRunner and GeminiRunner extend EventEmitter and emit "error",
     * but TypeScript can't resolve .on() on the union type, hence the cast.
     */
    private attachCrashRecoveryHandler;
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
     * Build the session context used to evaluate per-skill scope restrictions.
     *
     * Skill scopes (persisted in `scope.json` sidecars by the config-updater)
     * match against:
     * - the active repository's Cyrus config ID,
     * - the Linear team that owns the issue, and
     * - the Linear label IDs attached to the issue.
     *
     * The session's repo working-tree path(s) are also captured so that
     * repo-local skills (`<repoPath>/.claude/skills/*`) get unioned into the
     * resolved whitelist. When a `session` is provided its workspace is used to
     * resolve those paths (covering multi-repo sessions); otherwise the active
     * repository's path is used.
     */
    private buildSkillSessionContext;
    /**
     * Resolve the repo working-tree path(s) whose `.claude/skills/` directories
     * should contribute to the skill whitelist for a session.
     *
     * - Multi-repo sessions: every sub-worktree in `workspace.repoPaths`.
     * - Single-repo / GitHub-mention sessions: the active repository's path.
     */
    private resolveSkillRepoPaths;
    /**
     * Resolve default model for a given runner from config with sensible built-in defaults.
     * Supports legacy config keys for backwards compatibility.
     */
    private getDefaultModelForRunner;
    /**
     * Resolve default fallback model for a given runner from config with sensible built-in defaults.
     * Supports legacy Claude fallback key for backwards compatibility.
     */
    private getDefaultFallbackModelForRunner;
    /**
     * Instantiate the appropriate runner for the given type.
     */
    private createRunnerForType;
    /**
     * Determine system prompt based on issue labels and repository configuration
     */
    private determineSystemPromptFromLabels;
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
     * Convert full Linear SDK issue to CoreIssue interface for Session creation
     */
    private convertLinearIssueToCore;
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
     * @param linearWorkspaceId Workspace ID for issue tracker lookup
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
     * Download attachments from Linear issue
     * @param issue Linear issue object from webhook data
     * @param repository Repository configuration
     * @param workspacePath Path to workspace directory
     */
    private downloadIssueAttachments;
    /**
     * Download attachments from a specific comment
     * @param commentBody The body text of the comment
     * @param attachmentsDir Directory where attachments should be saved
     * @param linearToken Linear API token
     * @param existingAttachmentCount Current number of attachments already downloaded
     */
    private downloadCommentAttachments;
    /**
     * Generate attachment manifest for new comment attachments
     */
    private generateNewAttachmentManifest;
    private registerCyrusToolsMcpEndpoint;
    private failureModesClient;
    /**
     * Lazily build the HTTP client used by `log_failure_mode` to POST to
     * cyrus-hosted. Uses `CYRUS_APP_URL` (the same env var the remote
     * session-store client reads, see top of this file) so preview
     * environments and prod share a single way to point at a control
     * plane. Returns null when either the URL or the `CYRUS_API_KEY` are
     * missing — in that mode the tool is simply not registered, so
     * customer-mode CLI users without a control plane don't see a broken
     * tool.
     */
    private getFailureModesClient;
    /**
     * Resolve a working-directory string to the agent session id that owns
     * that workspace. The `log_failure_mode` MCP tool calls this with the
     * agent's reported `cwd`. We normalize and compare against each known
     * session's `workspace.path` (and any sub-repo paths the session opens).
     */
    /**
     * Resolve a working-directory string to the rich session bundle a
     * Cyrus team member needs to triage a failure-mode report: the
     * internal session id (for dedup), the runner session id + runner
     * type (so triage can pull the Claude/Gemini/Codex/Cursor transcript),
     * the Linear AgentSession + source-issue identifiers (so triage can
     * jump to the customer thread), and the workspace path (for repro).
     *
     * Returns null only when no session matches. We prefer an exact
     * workspace-path or sub-repo-path match; if neither hits, we fall
     * back to a prefix match for nested cwds (e.g. shells in a subdir).
     */
    /**
     * Aggregator over every place active sessions live in this process.
     * Today: the primary AgentSessionManager (issue sessions) and the
     * ChatSessionHandler's private one (Slack / GitHub-PR-chat / future
     * chat platforms). New session origins should be added here so
     * downstream consumers (currently just resolveSessionFromCwd) keep
     * working without modification — single open extension point (OCP),
     * single responsibility (SRP: this method's only job is "where do
     * sessions live?", separate from "how do we match one by cwd?").
     */
    private getAllKnownSessions;
    private resolveSessionFromCwd;
    private createCyrusToolsOptions;
    private handleChildSessionMapping;
    /**
     * Link a newly created agent session to the most recent Cyrus session on its
     * parent issue, so that when this (child) session completes, the parent
     * session is resumed with the child's result.
     *
     * Parent-child *issue* relationships are the channel for child completion
     * messages. Any issue whose parent has a Cyrus session is linked, regardless
     * of whether that parent session is currently running: an orchestrator that
     * has halted to wait for its sub-issue has status "complete" and is exactly
     * the parent that must be woken, so this deliberately does not filter to
     * active sessions. The resume path handles both a still-running parent
     * (streams the message in) and an exited one (resumes from its stored
     * runner session id).
     *
     * This replaces the mapping that used to be established by the removed
     * `linear_agent_session_create*` cyrus-tools. Linear delegation creates
     * exactly one session per issue, so deriving the link from the issue
     * hierarchy does not reintroduce concurrent child sessions on one issue.
     *
     * Never throws: a failed lookup only means the parent is not notified.
     */
    private linkChildSessionToParentIssueSession;
    private handleFeedbackDeliveryToChildSession;
    private getCyrusToolsMcpUrl;
    /**
     * Build the complete prompt for a session - shows full prompt assembly in one place
     *
     * New session prompt structure:
     * 1. Issue context (from buildIssueContextPrompt)
     * 2. User comment
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
     * Build prompt for new session - includes issue context and user comment
     */
    private buildNewSessionPrompt;
    /**
     * Build an <agent_context> block with dynamic values that skills can reference.
     *
     * Provides bot usernames so skills (e.g. verify-and-ship) can refer to the
     * correct bot account without hardcoding.
     */
    private buildAgentContextBlock;
    /**
     * Build prompt for existing session continuation - user comment and attachments only
     */
    private buildContinuationPrompt;
    /**
     * Determine the prompt type based on input flags and system prompt availability
     */
    private determinePromptType;
    /**
     * Load shared instructions that get appended to all system prompts
     */
    private loadSharedInstructions;
    /**
     * Adapter method for prompt assembly - routes to appropriate issue context builder
     */
    private buildIssueContextForPromptAssembly;
    /**
     * Resolve the default runner type for SimpleRunner (classification) use.
     * Uses config.defaultRunner if set, otherwise auto-detects from API keys,
     * falling back to "claude".
     */
    /**
     * Build agent runner configuration with common settings.
     * Delegates to RunnerConfigBuilder for shared config assembly.
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
     * Build disallowed tools list following the same hierarchy as allowed tools.
     * Accepts single or multiple repositories (intersection for multi-repo).
     */
    private buildDisallowedTools;
    /**
     * Build allowed tools list with Linear MCP tools automatically included.
     * Accepts single or multiple repositories (union for multi-repo).
     */
    private buildAllowedTools;
    /**
     * Get Agent Sessions for an issue
     */
    getAgentSessionsForIssue(issueId: string, _repositoryId: string): any[];
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
     * Whether the warm-session feature is enabled.
     *
     * Warm sessions are an opt-in optimization that pre-spawns Claude Code
     * subprocesses on startup so the first query after a restart skips the
     * cold-start cost. Disabled by default; opt in by setting
     * `CYRUS_ENABLE_WARM_SESSIONS=1` (or `=true`).
     */
    private isWarmSessionsEnabled;
    /**
     * Whether the remote Claude session store is explicitly disabled.
     *
     * The remote store mirrors SDK transcripts to the Cyrus hosted control
     * plane and is on by default whenever `CYRUS_APP_URL`, `CYRUS_API_KEY`,
     * and `CYRUS_TEAM_ID` are all set. Operators can opt out — without
     * unsetting those vars (which other features depend on) — by setting
     * `CYRUS_DISABLE_REMOTE_SESSION_STORE=1` (or `=true`).
     */
    private isRemoteSessionStoreDisabled;
    /**
     * Pre-warm the N most recently updated Claude sessions so the first query
     * after a CLI restart has near-zero cold-start latency (~20x faster).
     *
     * Uses startup() from @anthropic-ai/claude-agent-sdk with MCP_CONNECTION_NONBLOCKING=true
     * so the warm instances are ready in ~500ms rather than ~4s.
     * Warm instances are stored in this.warmInstances keyed by agentSessionId and
     * consumed by buildAgentRunnerConfig() when the first message arrives.
     *
     * Gated by `isWarmSessionsEnabled()` — callers should check before invoking.
     */
    private warmupRecentSessions;
    /**
     * Save current EdgeWorker state for all repositories
     */
    private savePersistedState;
    /**
     * Resume sessions that were interrupted by a crash/restart.
     * Looks for sessions with wasRunning === true and no active runner.
     * Uses the single AgentSessionManager instance.
     */
    private resumeInterruptedSessions;
    /**
     * Serialize EdgeWorker mappings to a serializable format (v4.0 flat format)
     */
    serializeMappings(): SerializableEdgeWorkerState;
    /**
     * Restore EdgeWorker mappings from serialized state (v4.0 flat format)
     */
    restoreMappings(state: SerializableEdgeWorkerState): void;
    /**
     * Post an activity directly via an issue tracker instance.
     * Consolidates try/catch and success/error logging for EdgeWorker call sites
     * that already have the issueTracker and agentSessionId resolved.
     *
     * @returns The activity ID when resolved, `null` otherwise.
     */
    private postActivityDirect;
    /**
     * Post instant acknowledgment thought when agent session is created
     */
    private postInstantAcknowledgment;
    /**
     * Post parent resume acknowledgment thought when parent session is resumed from child
     */
    private postParentResumeAcknowledgment;
    /**
     * Post combined routing activity showing repos selected + base branches resolved
     */
    private postRoutingActivity;
    /**
     * Handle prompt with streaming check - centralized logic for all input types
     *
     * This method implements the unified pattern for handling prompts:
     * 1. Check if runner is actively streaming
     * 2. Add to stream if streaming, OR resume session if not
     *
     * @param session The Cyrus agent session
     * @param repository Repository configuration
     * @param sessionId Linear agent activity session ID
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
     * @param sessionId The Linear agent session ID
     * @param agentSessionManager The agent session manager
     * @param promptBody The prompt text to send
     * @param attachmentManifest Optional attachment manifest
     * @param isNewSession Whether this is a new session
     */
    resumeAgentSession(session: CyrusAgentSession, repository: RepositoryConfig, sessionId: string, agentSessionManager: AgentSessionManager, promptBody: string, attachmentManifest?: string, isNewSession?: boolean, additionalAllowedDirectories?: string[], linearWorkspaceId?: string, maxTurns?: number, commentAuthor?: string, commentTimestamp?: string): Promise<void>;
    /**
     * Post instant acknowledgment thought when receiving prompted webhook
     */
    private postInstantPromptedAcknowledgment;
    /**
     * Get the platform type for a workspace's issue tracker.
     */
    private getRepositoryPlatform;
    /**
     * Fetch complete issue details from Linear API
     */
    fetchFullIssueDetails(issueId: string, linearWorkspaceId: string): Promise<Issue | null>;
    /**
     * Build OAuth config for LinearIssueTrackerService.
     * Uses workspace-level token storage.
     * Returns undefined if OAuth credentials are not available.
     */
    private buildOAuthConfig;
    /**
     * Save OAuth tokens to config.json (workspace-level storage)
     */
    private saveOAuthTokens;
}
//# sourceMappingURL=EdgeWorker.d.ts.map