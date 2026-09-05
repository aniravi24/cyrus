import type { HookCallbackMatcher, HookEvent, McpServerConfig, SandboxSettings, SDKMessage, SdkPluginConfig } from "cyrus-claude-runner";
import type { AgentRunnerConfig, CyrusAgentSession, ILogger, OnAskUserQuestion, OpenCodeConfigOverrides, RepositoryConfig, RunnerType } from "cyrus-core";
/**
 * Subset of McpConfigService consumed by RunnerConfigBuilder.
 */
export interface IMcpConfigProvider {
    buildMcpConfig(repoId: string, linearWorkspaceId: string, parentSessionId?: string): Record<string, McpServerConfig>;
    buildMergedMcpConfigPath(repositories: RepositoryConfig | RepositoryConfig[]): string | string[] | undefined;
}
/**
 * Subset of ToolPermissionResolver consumed by RunnerConfigBuilder.
 */
export interface IChatToolResolver {
    buildChatAllowedTools(mcpConfigKeys?: string[], userMcpTools?: string[]): string[];
}
/**
 * Subset of RunnerSelectionService consumed by RunnerConfigBuilder.
 */
export interface IRunnerSelector {
    getDefaultRunner(): RunnerType;
    determineRunnerSelection(labels: string[], issueDescription?: string): {
        runnerType: RunnerType;
        modelOverride?: string;
        fallbackModelOverride?: string;
    };
    getDefaultModelForRunner(runnerType: RunnerType): string | undefined;
    getDefaultEffortForRunner(runnerType: RunnerType): string | undefined;
    getDefaultFallbackModelForRunner(runnerType: RunnerType): string | undefined;
}
/**
 * Input for building a chat session runner config.
 */
export interface ChatRunnerConfigInput {
    workspacePath: string;
    workspaceName: string | undefined;
    systemPrompt: string;
    sessionId: string;
    resumeSessionId?: string;
    cyrusHome: string;
    /** Chat platform name (e.g. "slack") — used to namespace the shared auto-memory dir */
    platformName: string;
    /** Linear workspace ID for building fresh MCP config at session start */
    linearWorkspaceId?: string;
    /** Repository whose MCP runtime servers (Linear MCP, Cyrus tools, etc.) get
     * spun up for this chat session — chat sessions are repo-agnostic at the
     * session level, so this just picks one repo to seed those native servers. */
    repository?: RepositoryConfig;
    /** Repository paths the chat session can read */
    repositoryPaths?: string[];
    /**
     * Filesystem paths to custom-integration `.mcp.json` files to load for
     * this chat session (sourced from `EdgeWorkerConfig.slackMcpConfigs` for
     * Slack). Chat sessions are repo-agnostic, so `repository.mcpConfigPath`
     * is not consulted here — only this list determines which custom MCP
     * files the session loads. When empty/omitted, no custom `.mcp.json`
     * files are loaded (native servers built via `mcpConfigProvider` still
     * run as usual).
     */
    platformMcpConfigOverrides?: readonly string[];
    /** Whether Claude should ignore ambient MCP configuration. Defaults to true. */
    strictMcpConfig?: boolean;
    /** Plugins to load for the chat session (provides managed skills). */
    plugins?: SdkPluginConfig[];
    /**
     * Allow-list of skill names enabled for the chat session after scope
     * filtering. Claude passes this to the SDK directly; Codex stages only
     * these skills into its repository discovery layout.
     */
    skills?: string[] | "all";
    /** Global OpenCode runtime config overrides from Cyrus config */
    opencodeGlobalConfig?: OpenCodeConfigOverrides["config"];
    /** Global OpenCode CLI state scope from Cyrus config */
    opencodeGlobalStateScope?: OpenCodeConfigOverrides["stateScope"];
    /** Existing runner type to preserve when resuming a completed chat session */
    runnerType?: RunnerType;
    logger: ILogger;
    onMessage: (message: SDKMessage) => void | Promise<void>;
    onError: (error: Error) => void;
}
/**
 * Input for building an issue session runner config.
 */
export interface IssueRunnerConfigInput {
    session: CyrusAgentSession;
    repository: RepositoryConfig;
    sessionId: string;
    systemPrompt: string | undefined;
    allowedTools: string[];
    allowedDirectories: string[];
    disallowedTools: string[];
    resumeSessionId?: string;
    labels?: string[];
    issueDescription?: string;
    maxTurns?: number;
    /**
     * Filesystem paths to custom-integration `.mcp.json` files for this
     * issue session: `EdgeWorkerConfig.linearMcpConfigs` for Linear, or
     * `githubMcpConfigs` for GitHub/GitLab. The list is NOT a blanket
     * override — it's only consulted when the routed repo does NOT have its
     * own `allowedTools` override. If the repo has its own allow-list set,
     * the agent uses `repository.mcpConfigPath` instead so the repo's
     * permission rules and its server set always come from the same scope
     * (see `buildIssueConfig`).
     */
    platformMcpConfigOverrides?: readonly string[];
    /** Whether Claude should ignore ambient MCP configuration. Defaults to true. */
    strictMcpConfig?: boolean;
    linearWorkspaceId?: string;
    cyrusHome: string;
    logger: ILogger;
    onMessage: (message: SDKMessage) => void | Promise<void>;
    onError: (error: Error) => void;
    /** Factory to create AskUserQuestion callback (Claude runner only) */
    createAskUserQuestionCallback?: (sessionId: string, workspaceId: string) => OnAskUserQuestion;
    /** Resolve the Linear workspace ID for a repository */
    requireLinearWorkspaceId: (repo: RepositoryConfig) => string;
    /** Plugins to load for the session (provides skills, hooks, etc.) */
    plugins?: SdkPluginConfig[];
    /** Global OpenCode runtime config overrides from Cyrus config */
    opencodeGlobalConfig?: OpenCodeConfigOverrides["config"];
    /** Global OpenCode CLI state scope from Cyrus config */
    opencodeGlobalStateScope?: OpenCodeConfigOverrides["stateScope"];
    /**
     * Allow-list of skill names enabled for the session (after scope filtering),
     * or `"all"` to enable every discovered skill, or `undefined` to defer to
     * provider defaults. Managed-skill runners consume this according to their
     * native discovery layout.
     */
    skills?: string[] | "all";
    /** SDK sandbox settings (enabled, network proxy ports) for Claude runner */
    sandboxSettings?: SandboxSettings;
    /** CA cert path for MITM TLS termination — passed via child process env */
    egressCaCertPath?: string;
}
export declare function resolveIssueMcpConfigPath(repository: RepositoryConfig, platformMcpConfigOverrides: readonly string[] | undefined, buildMergedMcpConfigPath: (repositories: RepositoryConfig | RepositoryConfig[]) => string | string[] | undefined): string | string[] | undefined;
/**
 * Shared runner config assembly for both issue and chat sessions.
 *
 * Eliminates duplication between EdgeWorker.buildAgentRunnerConfig() and
 * ChatSessionHandler.buildRunnerConfig() by providing focused factory methods
 * that produce AgentRunnerConfig objects using injected services.
 */
export declare class RunnerConfigBuilder {
    private chatToolResolver;
    private mcpConfigProvider;
    private runnerSelector;
    constructor(chatToolResolver: IChatToolResolver, mcpConfigProvider: IMcpConfigProvider, runnerSelector: IRunnerSelector);
    /**
     * Build a runner config for chat sessions (Slack, GitHub chat, etc.).
     *
     * Chat sessions get read-only tools + MCP tool prefixes, and a simplified
     * config without hooks or model selection.
     */
    buildChatConfig(input: ChatRunnerConfigInput): AgentRunnerConfig;
    /**
     * Build a runner config for issue sessions (Linear issues, GitHub PRs).
     *
     * Issue sessions get full tool sets, runner type selection, model overrides,
     * hooks, and runner-specific configuration (Chrome, Cursor, etc.).
     */
    buildIssueConfig(input: IssueRunnerConfigInput): {
        config: AgentRunnerConfig;
        runnerType: RunnerType;
    };
    /**
     * Build a Stop hook that reminds the agent to commit, push, and open a PR
     * before ending the session. Blocks the first stop attempt and feeds the
     * guidance back to the agent via the SDK's native `decision: "block"` +
     * `reason` mechanism. The `stop_hook_active` flag prevents infinite loops —
     * once the hook has already fired, the next stop is always allowed through.
     */
    private buildStopHook;
    private runnerSupportsManagedSkills;
    /**
     * Build sandbox and env config for a Claude runner session.
     * Merges base sandbox settings with per-session filesystem restrictions
     * (worktree as the only writable directory) and passes the CA cert
     * for MITM TLS termination via additionalEnv instead of process.env.
     */
    private buildSandboxConfig;
    /**
     * Build PostToolUse hooks for screenshot/GIF tools that guide Claude
     * to upload files to Linear using linear_upload_file.
     */
    private buildScreenshotHooks;
}
/**
 * Build a Stop hook that ensures the agent ships work before ending the
 * session. Inspects the working tree at the session cwd and blocks the first
 * stop attempt when there are uncommitted tracked changes or commits ahead
 * on no remote-tracking ref. The `stop_hook_active` flag prevents infinite
 * loops — once the hook has fired, the next stop is allowed through.
 *
 * Pre-existing untracked files (local scratch files, env files, IDE
 * artifacts outside `.gitignore`) do not trigger the guardrail; new files
 * the agent writes are marked via `IntentToAddHook` so they still appear as
 * a tracked diff and re-trigger the block when forgotten. See CYPACK-1196.
 */
export declare function buildStopHook(log: ILogger): Partial<Record<HookEvent, HookCallbackMatcher[]>>;
/**
 * Inspect the working tree at `cwd` and return a guardrail message if there
 * is unshipped work (uncommitted tracked changes, or commits that are on no
 * remote). Returns null when the tree is clean, when `cwd` isn't a git
 * repo, or when git is unavailable — in those cases the stop is not blocked.
 *
 * Uses `--untracked-files=no` so that pre-existing untracked files in the
 * customer's worktree (scratch files, local env files, IDE artifacts) do not
 * wedge the session. Files Cyrus creates via Write/Edit are marked with
 * `git add --intent-to-add` by `IntentToAddHook` so they still show as a
 * tracked diff and block the stop when left uncommitted.
 */
export declare function inspectGitGuardrail(cwd: string, log: ILogger): string | null;
//# sourceMappingURL=RunnerConfigBuilder.d.ts.map