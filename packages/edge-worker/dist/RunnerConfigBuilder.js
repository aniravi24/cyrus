import { execSync } from "node:child_process";
import { join } from "node:path";
import { buildIntentToAddHook } from "./hooks/IntentToAddHook.js";
import { buildPrMarkerHook } from "./hooks/PrMarkerHook.js";
import { appendBrowserUseAddendum } from "./prompts/browserUsePromptAddendum.js";
import { appendCloudRuntimeAddendum } from "./prompts/cloudRuntimePromptAddendum.js";
import { appendFailureModeAddendum } from "./prompts/failureModePromptAddendum.js";
import { appendGitHubCliMediaAddendum } from "./prompts/githubCliMediaPromptAddendum.js";
export function resolveIssueMcpConfigPath(repository, platformMcpConfigOverrides, buildMergedMcpConfigPath) {
    const repoHasAllowedToolsOverride = Array.isArray(repository.allowedTools) &&
        repository.allowedTools.length > 0;
    if (repoHasAllowedToolsOverride) {
        return buildMergedMcpConfigPath(repository);
    }
    if (!platformMcpConfigOverrides || platformMcpConfigOverrides.length === 0) {
        return undefined;
    }
    if (platformMcpConfigOverrides.length === 1) {
        return platformMcpConfigOverrides[0];
    }
    return [...platformMcpConfigOverrides];
}
/**
 * Shared runner config assembly for both issue and chat sessions.
 *
 * Eliminates duplication between EdgeWorker.buildAgentRunnerConfig() and
 * ChatSessionHandler.buildRunnerConfig() by providing focused factory methods
 * that produce AgentRunnerConfig objects using injected services.
 */
export class RunnerConfigBuilder {
    chatToolResolver;
    mcpConfigProvider;
    runnerSelector;
    constructor(chatToolResolver, mcpConfigProvider, runnerSelector) {
        this.chatToolResolver = chatToolResolver;
        this.mcpConfigProvider = mcpConfigProvider;
        this.runnerSelector = runnerSelector;
    }
    /**
     * Build a runner config for chat sessions (Slack, GitHub chat, etc.).
     *
     * Chat sessions get read-only tools + MCP tool prefixes, and a simplified
     * config without hooks or model selection.
     */
    buildChatConfig(input) {
        // MCP config paths for chat sessions come exclusively from the
        // platform override list (e.g. `slackMcpConfigs`). Chat sessions
        // are repo-agnostic at the session level — we do NOT fall back to
        // "first repo wins" `repository.mcpConfigPath` (the prior V1
        // default), because that arbitrarily privileged whichever repo
        // loaded first. When the platform list is empty, the chat
        // session simply loads no per-repo `.mcp.json` files.
        const mcpConfigPath = input.platformMcpConfigOverrides &&
            input.platformMcpConfigOverrides.length > 0
            ? input.platformMcpConfigOverrides.length === 1
                ? input.platformMcpConfigOverrides[0]
                : [...input.platformMcpConfigOverrides]
            : undefined;
        // Build fresh MCP config at session start (reads current token from config)
        // This follows the same pattern as buildIssueConfig — never use a pre-baked config
        const mcpConfig = input.linearWorkspaceId && input.repository
            ? this.mcpConfigProvider.buildMcpConfig(input.repository.id, input.linearWorkspaceId, input.sessionId)
            : undefined;
        // Extract MCP tool entries from the repository's allowedTools config
        const userMcpTools = (input.repository?.allowedTools ?? []).filter((tool) => tool.startsWith("mcp__"));
        const mcpConfigKeys = mcpConfig ? Object.keys(mcpConfig) : undefined;
        const allowedTools = this.chatToolResolver.buildChatAllowedTools(mcpConfigKeys, userMcpTools);
        const repositoryPaths = Array.from(new Set((input.repositoryPaths ?? []).filter(Boolean)));
        input.logger.debug("Chat session allowed tools:", allowedTools);
        const runnerType = input.runnerType ?? this.runnerSelector.getDefaultRunner();
        // Shared auto-memory across all chat threads on this platform. Lives
        // under cyrusHome (not the per-thread workspace) so memory built up in
        // one Slack thread is available to every other Slack thread.
        const autoMemoryDirectory = join(input.cyrusHome, `${input.platformName}-memory`);
        return {
            runnerType,
            workingDirectory: input.workspacePath,
            allowedTools,
            disallowedTools: [],
            allowedDirectories: [
                input.workspacePath,
                autoMemoryDirectory,
                ...repositoryPaths,
            ],
            workspaceName: input.workspaceName,
            cyrusHome: input.cyrusHome,
            autoMemoryDirectory,
            appendSystemPrompt: appendCloudRuntimeAddendum(appendGitHubCliMediaAddendum(appendBrowserUseAddendum(appendFailureModeAddendum(input.systemPrompt)))),
            ...(mcpConfig ? { mcpConfig } : {}),
            ...(mcpConfigPath ? { mcpConfigPath } : {}),
            strictMcpConfig: input.strictMcpConfig ?? true,
            ...(input.resumeSessionId
                ? { resumeSessionId: input.resumeSessionId }
                : {}),
            ...(input.plugins?.length ? { plugins: input.plugins } : {}),
            ...(input.skills !== undefined ? { skills: input.skills } : {}),
            ...(runnerType === "opencode" && {
                opencodeGlobalConfig: input.opencodeGlobalConfig,
                opencodeRepositoryConfig: input.repository?.opencode?.config,
                opencodeStateScope: input.repository?.opencode?.stateScope ??
                    input.opencodeGlobalStateScope,
                opencodeStateKey: input.repository?.id,
            }),
            logger: input.logger,
            maxTurns: 200,
            onMessage: input.onMessage,
            onError: input.onError,
        };
    }
    /**
     * Build a runner config for issue sessions (Linear issues, GitHub PRs).
     *
     * Issue sessions get full tool sets, runner type selection, model overrides,
     * hooks, and runner-specific configuration (Chrome, Cursor, etc.).
     */
    buildIssueConfig(input) {
        const log = input.logger;
        // Configure hooks: PostToolUse for screenshot tools + PR-marker enforcement,
        // plus the Stop hook that blocks the session when work is unshipped.
        const screenshotHooks = this.buildScreenshotHooks(log);
        const prMarkerHook = buildPrMarkerHook(log);
        const intentToAddHook = buildIntentToAddHook(log);
        const stopHook = this.buildStopHook(log);
        const hooks = {
            ...stopHook,
            PostToolUse: [
                ...(screenshotHooks.PostToolUse ?? []),
                ...(prMarkerHook.PostToolUse ?? []),
                ...(intentToAddHook.PostToolUse ?? []),
            ],
        };
        // Determine runner type and model override from selectors
        const runnerSelection = this.runnerSelector.determineRunnerSelection(input.labels || [], input.issueDescription);
        let runnerType = runnerSelection.runnerType;
        let modelOverride = runnerSelection.modelOverride;
        let fallbackModelOverride = runnerSelection.fallbackModelOverride;
        // If the labels have changed, and we are resuming a session. Use the existing runner for the session.
        if (input.session.claudeSessionId && runnerType !== "claude") {
            runnerType = "claude";
            modelOverride = this.runnerSelector.getDefaultModelForRunner("claude");
            fallbackModelOverride =
                this.runnerSelector.getDefaultFallbackModelForRunner("claude");
        }
        else if (input.session.geminiSessionId && runnerType !== "gemini") {
            runnerType = "gemini";
            modelOverride = this.runnerSelector.getDefaultModelForRunner("gemini");
            fallbackModelOverride =
                this.runnerSelector.getDefaultFallbackModelForRunner("gemini");
        }
        else if (input.session.codexSessionId && runnerType !== "codex") {
            runnerType = "codex";
            modelOverride = this.runnerSelector.getDefaultModelForRunner("codex");
            fallbackModelOverride =
                this.runnerSelector.getDefaultFallbackModelForRunner("codex");
        }
        else if (input.session.cursorSessionId && runnerType !== "cursor") {
            runnerType = "cursor";
            modelOverride = this.runnerSelector.getDefaultModelForRunner("cursor");
            fallbackModelOverride =
                this.runnerSelector.getDefaultFallbackModelForRunner("cursor");
        }
        else if (input.session.opencodeSessionId && runnerType !== "opencode") {
            runnerType = "opencode";
            modelOverride = this.runnerSelector.getDefaultModelForRunner("opencode");
            fallbackModelOverride =
                this.runnerSelector.getDefaultFallbackModelForRunner("opencode");
        }
        // Log model override if found
        if (modelOverride) {
            log.debug(`Model override via selector: ${modelOverride}`);
        }
        // Determine final model from selectors, repository override, then runner-specific defaults
        const finalModel = modelOverride ||
            input.repository.model ||
            this.runnerSelector.getDefaultModelForRunner(runnerType);
        // Effort has no label/description selector - repository override, then global default.
        const finalEffort = input.repository.effort ||
            this.runnerSelector.getDefaultEffortForRunner(runnerType);
        const resolvedWorkspaceId = input.linearWorkspaceId ??
            input.requireLinearWorkspaceId(input.repository);
        const mcpConfig = this.mcpConfigProvider.buildMcpConfig(input.repository.id, resolvedWorkspaceId, input.sessionId);
        // Repo-override vs platform-default resolution for MCP config paths:
        //   - If the routed repo has its own `allowedTools` override, it
        //     also owns its own MCP config — use `repository.mcpConfigPath`
        //     so the repo-scoped allow-list lines up with the repo-scoped
        //     server set. The two travel as a unit.
        //   - Otherwise the repo inherits the platform's allow-list, and
        //     should likewise inherit the platform's MCP config list
        //     (`linearMcpConfigs` / `githubMcpConfigs`).
        // This guarantees the agent's permission rules and the loaded MCP
        // server set always come from the same scope.
        const mcpConfigPath = resolveIssueMcpConfigPath(input.repository, input.platformMcpConfigOverrides, this.mcpConfigProvider.buildMergedMcpConfigPath.bind(this.mcpConfigProvider));
        // Multi-repo sessions place each repo in a sibling sub-worktree of the
        // cwd (the workspace container). Register those sub-worktrees as
        // `--add-dir` roots so the runner auto-loads each one's `.claude/skills/`
        // — the cwd-rooted project-skill scan alone would miss them. Single-repo
        // sessions have cwd === the worktree, so there is nothing extra to add.
        const cwd = input.session.workspace.path;
        const additionalDirectories = Object.values(input.session.workspace.repoPaths ?? {}).filter((p) => typeof p === "string" && p !== cwd);
        const config = {
            workingDirectory: cwd,
            allowedTools: input.allowedTools,
            disallowedTools: input.disallowedTools,
            allowedDirectories: input.allowedDirectories,
            ...(additionalDirectories.length > 0 && { additionalDirectories }),
            workspaceName: input.session.issue?.identifier || input.session.issueId,
            cyrusHome: input.cyrusHome,
            mcpConfigPath,
            mcpConfig,
            strictMcpConfig: input.strictMcpConfig ?? true,
            appendSystemPrompt: appendCloudRuntimeAddendum(appendGitHubCliMediaAddendum(appendBrowserUseAddendum(appendFailureModeAddendum(input.systemPrompt)))),
            // Priority order: label override > repository config > global default
            model: finalModel,
            ...(finalEffort ? { effort: finalEffort } : {}),
            fallbackModel: fallbackModelOverride ||
                input.repository.fallbackModel ||
                this.runnerSelector.getDefaultFallbackModelForRunner(runnerType),
            logger: log,
            hooks,
            // Plugins providing managed skills.
            ...(this.runnerSupportsManagedSkills(runnerType) &&
                input.plugins?.length && { plugins: input.plugins }),
            // Skill scope allow-list. Each managed-skill runner maps this into its
            // native skill discovery mechanism.
            ...(this.runnerSupportsManagedSkills(runnerType) &&
                input.skills !== undefined && { skills: input.skills }),
            // SDK sandbox settings (Claude runner only):
            // - Merge base settings with per-session filesystem.allowWrite (worktree path)
            // - Pass CA cert path via env for MITM TLS termination
            ...(runnerType === "claude" &&
                input.sandboxSettings &&
                this.buildSandboxConfig(input)),
            // AskUserQuestion callback - only for Claude runner
            ...(runnerType === "claude" &&
                input.createAskUserQuestionCallback && {
                onAskUserQuestion: input.createAskUserQuestionCallback(input.sessionId, resolvedWorkspaceId),
            }),
            ...(runnerType === "opencode" && {
                opencodeGlobalConfig: input.opencodeGlobalConfig,
                opencodeRepositoryConfig: input.repository.opencode?.config,
                opencodeStateScope: input.repository.opencode?.stateScope ??
                    input.opencodeGlobalStateScope,
                opencodeStateKey: input.repository.id,
            }),
            onMessage: input.onMessage,
            onError: input.onError,
        };
        // Cursor runner uses @cursor/sdk. Pass through API key, the same
        // sandboxSettings shape Claude consumes (the runner translates it to
        // Cursor's `.cursor/sandbox.json` schema), and the egress CA bundle
        // path for MITM TLS trust in sandboxed children. SDK ≥1.0.11
        // auto-discovers the bundled `cursorsandbox` helper from the
        // platform-specific optionalDependency.
        if (runnerType === "cursor") {
            config.cursorApiKey = process.env.CURSOR_API_KEY || undefined;
            if (input.sandboxSettings) {
                config.sandboxSettings = input.sandboxSettings;
            }
            if (input.egressCaCertPath) {
                config.egressCaCertPath = input.egressCaCertPath;
            }
        }
        // When the egress sandbox is enabled, give Codex the same filesystem
        // posture Claude gets (see buildSandboxConfig): writes restricted to the
        // worktree, reads restricted to the worktree + allowed directories (home
        // is denied by omission). The Codex runner turns this into a per-thread
        // app-server permission profile (read/write allow-list).
        if (runnerType === "codex" && input.sandboxSettings) {
            config.sandboxSettings = {
                allowWrite: [input.session.workspace.path],
                allowRead: [input.session.workspace.path, ...input.allowedDirectories],
            };
        }
        if (input.resumeSessionId) {
            config.resumeSessionId = input.resumeSessionId;
        }
        if (input.maxTurns !== undefined) {
            config.maxTurns = input.maxTurns;
        }
        return { config, runnerType };
    }
    /**
     * Build a Stop hook that reminds the agent to commit, push, and open a PR
     * before ending the session. Blocks the first stop attempt and feeds the
     * guidance back to the agent via the SDK's native `decision: "block"` +
     * `reason` mechanism. The `stop_hook_active` flag prevents infinite loops —
     * once the hook has already fired, the next stop is always allowed through.
     */
    buildStopHook(log) {
        return buildStopHook(log);
    }
    runnerSupportsManagedSkills(runnerType) {
        return runnerType === "claude" || runnerType === "codex";
    }
    /**
     * Build sandbox and env config for a Claude runner session.
     * Merges base sandbox settings with per-session filesystem restrictions
     * (worktree as the only writable directory) and passes the CA cert
     * for MITM TLS termination via additionalEnv instead of process.env.
     */
    buildSandboxConfig(input) {
        const result = {};
        if (input.sandboxSettings) {
            result.sandbox = {
                ...input.sandboxSettings,
                // When sandbox is enabled, do not allow commands to run unsandboxed
                allowUnsandboxedCommands: false,
                // Required for Go-based tools (gh, gcloud, terraform) to verify TLS certs
                // when using httpProxyPort with a MITM proxy and custom CA. macOS only —
                // opens access to com.apple.trustd.agent, which is a potential data
                // exfiltration path. See: https://code.claude.com/docs/en/settings#sandbox-settings
                enableWeakerNetworkIsolation: true,
                filesystem: {
                    ...input.sandboxSettings.filesystem,
                    // "." resolves to the cwd of the primary folder Claude is working in.
                    // See: https://code.claude.com/docs/en/settings#sandbox-path-prefixes
                    // allowedDirectories contains the attachments dir, repo paths, and git
                    // metadata dirs — all of which need OS-level read access alongside the worktree.
                    allowRead: [".", ...input.allowedDirectories],
                    denyRead: ["~/"],
                    // Restrict subprocess writes to the session worktree only
                    allowWrite: [input.session.workspace.path],
                },
            };
        }
        if (input.egressCaCertPath) {
            result.additionalEnv = {
                // Node.js (SDK, npm, etc.)
                NODE_EXTRA_CA_CERTS: input.egressCaCertPath,
                // OpenSSL-based tools (general fallback — also covers Ruby)
                SSL_CERT_FILE: input.egressCaCertPath,
                // Git HTTPS operations
                GIT_SSL_CAINFO: input.egressCaCertPath,
                // Python requests/pip
                REQUESTS_CA_BUNDLE: input.egressCaCertPath,
                PIP_CERT: input.egressCaCertPath,
                // curl (when compiled against OpenSSL, not SecureTransport)
                CURL_CA_BUNDLE: input.egressCaCertPath,
                // Rust/Cargo
                CARGO_HTTP_CAINFO: input.egressCaCertPath,
                // AWS CLI / boto3
                AWS_CA_BUNDLE: input.egressCaCertPath,
                // Deno
                DENO_CERT: input.egressCaCertPath,
            };
        }
        return result;
    }
    /**
     * Build PostToolUse hooks for screenshot/GIF tools that guide Claude
     * to upload files to Linear using linear_upload_file.
     */
    buildScreenshotHooks(log) {
        return {
            PostToolUse: [
                {
                    matcher: "playwright_screenshot",
                    hooks: [
                        async (input, _toolUseID, { signal: _signal }) => {
                            const postToolUseInput = input;
                            log.debug(`Tool ${postToolUseInput.tool_name} completed with response:`, postToolUseInput.tool_response);
                            const response = postToolUseInput.tool_response;
                            const filePath = response?.path || "the screenshot file";
                            return {
                                continue: true,
                                additionalContext: `Screenshot taken successfully. To share this screenshot in Linear comments, use the linear_upload_file tool to upload ${filePath}. This will return an asset URL that can be embedded in markdown. You can also use the Read tool to view the screenshot file to analyze the visual content.`,
                            };
                        },
                    ],
                },
                {
                    matcher: "mcp__chrome-devtools__take_screenshot",
                    hooks: [
                        async (input, _toolUseID, { signal: _signal }) => {
                            const postToolUseInput = input;
                            // Extract file path from input (the tool saves to filePath parameter)
                            const toolInput = postToolUseInput.tool_input;
                            const filePath = toolInput?.filePath || "the screenshot file";
                            return {
                                continue: true,
                                additionalContext: `Screenshot saved. To share this screenshot in Linear comments, use the linear_upload_file tool to upload ${filePath}. This will return an asset URL that can be embedded in markdown.`,
                            };
                        },
                    ],
                },
            ],
        };
    }
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
export function buildStopHook(log) {
    return {
        Stop: [
            {
                matcher: ".*",
                hooks: [
                    async (input) => {
                        const stopInput = input;
                        // Prevent infinite loops: if the hook already fired, allow the stop.
                        if (stopInput.stop_hook_active) {
                            return {};
                        }
                        const guardrail = inspectGitGuardrail(stopInput.cwd, log);
                        if (!guardrail) {
                            return {};
                        }
                        return {
                            decision: "block",
                            reason: guardrail,
                        };
                    },
                ],
            },
        ],
    };
}
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
export function inspectGitGuardrail(cwd, log) {
    const runGit = (args) => {
        return execSync(`git ${args}`, {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    };
    let status;
    try {
        status = runGit("status --porcelain --untracked-files=no");
    }
    catch (err) {
        log.debug(`PR guardrail: skipping (cwd is not a git repo or git failed): ${err.message}`);
        return null;
    }
    const uncommittedFiles = status
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    const hasUncommitted = uncommittedFiles.length > 0;
    // Count commits reachable from HEAD but from no remote-tracking ref. This is
    // the literal question the guardrail message asks ("not yet on the remote"),
    // and unlike an upstream or base-branch comparison it does not depend on how
    // the branch was created. A worktree checked out to review someone else's PR
    // tracks the base branch, so `@{u}..HEAD` counts that PR's own already-pushed
    // commits and blocks every review session; `--not --remotes` reports 0 there
    // while still reporting N for a branch the agent committed to but never pushed.
    let unpushedCount = 0;
    try {
        // With no remote configured there is nowhere to push, so commits alone
        // must not block the stop.
        const hasRemoteRef = runGit("for-each-ref --count=1 refs/remotes").length > 0;
        if (hasRemoteRef) {
            unpushedCount =
                parseInt(runGit("rev-list --count HEAD --not --remotes"), 10) || 0;
        }
    }
    catch {
        // git failed — don't block on commits alone.
    }
    if (!hasUncommitted && unpushedCount === 0) {
        return null;
    }
    const parts = [];
    if (hasUncommitted) {
        parts.push(`${uncommittedFiles.length} uncommitted file change${uncommittedFiles.length === 1 ? "" : "s"}`);
    }
    if (unpushedCount > 0) {
        parts.push(`${unpushedCount} commit${unpushedCount === 1 ? "" : "s"} not yet on the remote`);
    }
    return (`You appear to be ending the session, but the working tree has ${parts.join(" and ")}. ` +
        "Before stopping:\n" +
        "1. Commit any uncommitted changes with a descriptive message.\n" +
        "2. Push the branch to the remote.\n" +
        "3. Create or update a pull request that summarizes the change.\n\n" +
        "If the work is genuinely complete and a PR is not appropriate (for example, a question or research task with no intended code changes), you may stop again — this guardrail only blocks once per session.");
}
//# sourceMappingURL=RunnerConfigBuilder.js.map