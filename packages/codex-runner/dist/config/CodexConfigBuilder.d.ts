import type { ResolvedCodexConfig } from "../backend/types.js";
import type { CodexRunnerConfig } from "../types.js";
/**
 * Assembles a transport-neutral {@link ResolvedCodexConfig} from a
 * {@link CodexRunnerConfig}. Single responsibility: configuration resolution
 * (model fallback, sandbox, reasoning effort, MCP translation, env, home dir).
 * Produces no side effects beyond ensuring the Codex home directory exists.
 */
export declare class CodexConfigBuilder {
    private readonly config;
    constructor(config: CodexRunnerConfig);
    build(): Promise<ResolvedCodexConfig>;
    /**
     * Network intent for the sandbox. Defaults to enabled (so common remote
     * workflows — git/gh — work without danger-full-access); honors an explicit
     * `sandbox_workspace_write.network_access` in the passed-through overrides.
     */
    private resolveNetworkAccess;
    private getAdditionalDirectories;
    private resolveCodexHome;
    private buildEnvOverride;
    /**
     * Global Codex config overrides — currently just MCP servers. Sandbox
     * (writable/readable roots, network) is owned by {@link resolveCodexSandbox}
     * and `developer_instructions` is surfaced on
     * {@link ResolvedCodexConfig.developerInstructions}, so neither is injected
     * here. Any caller-supplied `sandbox_workspace_write` is dropped (its
     * `network_access` is folded into the sandbox decision via
     * {@link resolveNetworkAccess}) to keep a single source of truth.
     */
    private buildConfigOverrides;
    /**
     * If the configured model is unreachable via the OpenAI API, swap to the
     * fallback model before starting. Skipped when there is no API key (Codex
     * native auth handles access) or when the user has a ChatGPT subscription.
     */
    private resolveModelWithFallback;
    private hasCodexSubscription;
}
//# sourceMappingURL=CodexConfigBuilder.d.ts.map