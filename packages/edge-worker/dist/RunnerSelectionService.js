/**
 * The repository's `[model=...]` selectors are Claude Code aliases. omp resolves
 * them by fuzzy match, which is NOT newest-first - `sonnet` lands on
 * `claude-sonnet-4-0` - so each alias is pinned to the current model instead.
 */
const OMP_ALIAS_MODELS = {
    fable: "anthropic/claude-fable-5-1",
    haiku: "anthropic/claude-haiku-4-5",
    opus: "anthropic/claude-opus-5",
    sonnet: "anthropic/claude-sonnet-5",
};
export class RunnerSelectionService {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Update the internal config reference (e.g. after hot-reload).
     */
    setConfig(config) {
        this.config = config;
    }
    /**
     * Determine the default runner type.
     *
     * Priority:
     * 1. Explicit `defaultRunner` in config
     * 2. Auto-detect from available provider credentials (if exactly one runner has keys)
     * 3. Fall back to "claude"
     */
    getDefaultRunner() {
        if (this.config.defaultRunner) {
            return this.config.defaultRunner;
        }
        // Auto-detect from environment: if exactly one runner's API key is set, use it
        const available = [];
        if (process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY) {
            available.push("claude");
        }
        if (process.env.GEMINI_API_KEY) {
            available.push("gemini");
        }
        if (process.env.OPENAI_API_KEY) {
            available.push("codex");
        }
        if (process.env.CURSOR_API_KEY) {
            available.push("cursor");
        }
        if (available.length === 1 && available[0]) {
            return available[0];
        }
        return "claude";
    }
    /**
     * Resolve default model for a given runner from config with sensible built-in defaults.
     */
    getDefaultModelForRunner(runnerType) {
        if (runnerType === "claude") {
            return (this.config.claudeDefaultModel || this.config.defaultModel || "opus");
        }
        if (runnerType === "gemini") {
            return this.config.geminiDefaultModel || "gemini-2.5-pro";
        }
        if (runnerType === "cursor") {
            return this.config.cursorDefaultModel || "composer-2";
        }
        if (runnerType === "opencode") {
            return this.config.opencodeDefaultModel;
        }
        if (runnerType === "omp") {
            return this.config.ompDefaultModel;
        }
        return this.config.codexDefaultModel || "gpt-5.5";
    }
    /**
     * Resolve default reasoning effort for the Claude runner.
     *
     * Returns undefined when unconfigured so the harness default stands, rather
     * than this service inventing one. Only Claude is covered; the other runners
     * carry their own reasoning controls.
     */
    getDefaultEffortForRunner(runnerType) {
        return runnerType === "claude"
            ? this.config.claudeDefaultEffort
            : undefined;
    }
    /**
     * Resolve default fallback model for a given runner from config with sensible built-in defaults.
     * Supports legacy Claude fallback key for backwards compatibility.
     */
    getDefaultFallbackModelForRunner(runnerType) {
        if (runnerType === "claude") {
            return (this.config.claudeDefaultFallbackModel ||
                this.config.defaultFallbackModel ||
                "sonnet");
        }
        if (runnerType === "gemini") {
            return "gemini-2.5-flash";
        }
        if (runnerType === "codex") {
            return "gpt-5.2-codex";
        }
        if (runnerType === "cursor") {
            return this.config.cursorDefaultFallbackModel || "composer-2";
        }
        if (runnerType === "opencode") {
            return this.config.opencodeDefaultFallbackModel;
        }
        if (runnerType === "omp") {
            return this.config.ompDefaultFallbackModel;
        }
        return "gpt-5";
    }
    /**
     * Parse a bracketed tag from issue description.
     *
     * Supports escaped brackets (`\\[tag=value\\]`) which Linear can emit.
     */
    parseDescriptionTag(description, tagName) {
        const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`\\\\?\\[${escapedTag}=([a-zA-Z0-9_.:/-]+)\\\\?\\]`, "i");
        const match = description.match(pattern);
        return match?.[1];
    }
    /**
     * Determine runner type and model using labels + issue description tags.
     *
     * Supported description tags:
     * - [agent=claude|gemini|codex|cursor|opencode|omp]
     * - [model=<model-name>]
     *
     * Supported Linear label selectors:
     * - <provider>/<model>, where provider is claude, gemini, codex, cursor, or openai
     * - opencode/<provider>/<model> for OpenCode provider-qualified models
     *
     * Precedence:
     * 1. Description tags override labels
     * 2. Provider/model labels override separate agent or model labels
     * 3. Agent labels override model labels
     * 4. Model labels can infer agent type
     * 5. Defaults to configured/default runner
     */
    determineRunnerSelection(labels, issueDescription) {
        const normalizedLabels = (labels || []).map((label) => label.toLowerCase());
        const normalizedDescription = issueDescription || "";
        const descriptionAgentTagRaw = this.parseDescriptionTag(normalizedDescription, "agent");
        const descriptionModelTagRaw = this.parseDescriptionTag(normalizedDescription, "model");
        const defaultModelByRunner = {
            claude: this.getDefaultModelForRunner("claude"),
            gemini: this.getDefaultModelForRunner("gemini"),
            codex: this.getDefaultModelForRunner("codex"),
            cursor: this.getDefaultModelForRunner("cursor"),
            opencode: this.getDefaultModelForRunner("opencode"),
            omp: this.getDefaultModelForRunner("omp"),
        };
        const defaultFallbackByRunner = {
            claude: this.getDefaultFallbackModelForRunner("claude"),
            gemini: this.getDefaultFallbackModelForRunner("gemini"),
            codex: this.getDefaultFallbackModelForRunner("codex"),
            cursor: this.getDefaultFallbackModelForRunner("cursor"),
            opencode: this.getDefaultFallbackModelForRunner("opencode"),
            omp: this.getDefaultFallbackModelForRunner("omp"),
        };
        const isCodexModel = (model) => /gpt-[a-z0-9.-]*codex$/i.test(model) || /^gpt-[a-z0-9.-]+$/i.test(model);
        const isOpenCodeProviderModel = (model) => /^[a-z0-9_.-]+\/[a-z0-9_.:/-]+$/i.test(model);
        const inferRunnerFromModel = (model) => {
            if (!model)
                return undefined;
            const normalizedModel = model.toLowerCase();
            if (this.config.inferOpenCodeRunnerFromProviderModel &&
                isOpenCodeProviderModel(normalizedModel)) {
                return "opencode";
            }
            if (normalizedModel.startsWith("gemini"))
                return "gemini";
            if (normalizedModel === "fable" ||
                normalizedModel === "opus" ||
                normalizedModel === "sonnet" ||
                normalizedModel === "haiku" ||
                normalizedModel.startsWith("claude")) {
                return "claude";
            }
            if (isCodexModel(normalizedModel))
                return "codex";
            return undefined;
        };
        const inferFallbackModel = (model, runnerType) => {
            const normalizedModel = model.toLowerCase();
            if (runnerType === "claude") {
                if (normalizedModel === "fable")
                    return "opus";
                if (normalizedModel === "opus")
                    return "sonnet";
                if (normalizedModel === "sonnet")
                    return "haiku";
                // Keep haiku fallback on sonnet for retry behavior
                if (normalizedModel === "haiku")
                    return "sonnet";
                return "sonnet";
            }
            if (runnerType === "gemini") {
                if (normalizedModel === "gemini-3" ||
                    normalizedModel === "gemini-3-pro" ||
                    normalizedModel === "gemini-3-pro-preview") {
                    return "gemini-2.5-pro";
                }
                if (normalizedModel === "gemini-2.5-pro" ||
                    normalizedModel === "gemini-2.5") {
                    return "gemini-2.5-flash";
                }
                if (normalizedModel === "gemini-2.5-flash") {
                    return "gemini-2.5-flash-lite";
                }
                if (normalizedModel === "gemini-2.5-flash-lite") {
                    return "gemini-2.5-flash-lite";
                }
                return "gemini-2.5-flash";
            }
            if (runnerType === "opencode") {
                return defaultFallbackByRunner.opencode;
            }
            // One configured fallback for every omp model: omp already rotates
            // accounts and switches providers on its own (`retry_fallback_applied`),
            // so a second per-alias ladder here would only add a rule nobody asked
            // for on top of the knob that is actually set.
            if (runnerType === "omp") {
                return defaultFallbackByRunner.omp;
            }
            if (isCodexModel(normalizedModel)) {
                return "gpt-5.2-codex";
            }
            return "gpt-5";
        };
        const resolveRunnerFromName = (name) => {
            if (!name)
                return undefined;
            if (name === "omp")
                return "omp";
            if (name === "opencode")
                return "opencode";
            if (name === "cursor")
                return "cursor";
            if (name === "codex" || name === "openai")
                return "codex";
            if (name === "gemini")
                return "gemini";
            if (name === "claude")
                return "claude";
            return undefined;
        };
        const resolveAgentFromLabel = (lowercaseLabels) => {
            if (lowercaseLabels.includes("omp")) {
                return "omp";
            }
            if (lowercaseLabels.includes("opencode")) {
                return "opencode";
            }
            if (lowercaseLabels.includes("cursor")) {
                return "cursor";
            }
            if (lowercaseLabels.includes("codex") ||
                lowercaseLabels.includes("openai")) {
                return "codex";
            }
            if (lowercaseLabels.includes("gemini")) {
                return "gemini";
            }
            if (lowercaseLabels.includes("claude")) {
                return "claude";
            }
            return undefined;
        };
        const resolveProviderModelFromLabel = (lowercaseLabels) => {
            for (const label of lowercaseLabels) {
                const opencodeMatch = label.match(/^opencode\/([a-z0-9_.-]+\/[a-z0-9_.:/-]+)$/i);
                if (opencodeMatch?.[1]) {
                    return { runnerType: "opencode", model: opencodeMatch[1] };
                }
                const match = label.match(/^([a-z0-9_.-]+)\/([a-z0-9_.:/-]+)$/i);
                if (!match?.[1] || !match[2])
                    continue;
                const runnerType = resolveRunnerFromName(match[1]);
                if (runnerType === "opencode") {
                    return { runnerType, model: label };
                }
                if (runnerType) {
                    return { runnerType, model: match[2] };
                }
            }
            return undefined;
        };
        const resolveModelFromLabel = (lowercaseLabels) => {
            const codexModelLabel = lowercaseLabels.find((label) => isCodexModel(label));
            if (codexModelLabel) {
                return codexModelLabel;
            }
            if (lowercaseLabels.includes("gemini-2.5-pro") ||
                lowercaseLabels.includes("gemini-2.5")) {
                return "gemini-2.5-pro";
            }
            if (lowercaseLabels.includes("gemini-2.5-flash")) {
                return "gemini-2.5-flash";
            }
            if (lowercaseLabels.includes("gemini-2.5-flash-lite")) {
                return "gemini-2.5-flash-lite";
            }
            if (lowercaseLabels.includes("gemini-3") ||
                lowercaseLabels.includes("gemini-3-pro") ||
                lowercaseLabels.includes("gemini-3-pro-preview")) {
                return "gemini-3-pro-preview";
            }
            if (lowercaseLabels.includes("fable"))
                return "fable";
            if (lowercaseLabels.includes("opus"))
                return "opus";
            if (lowercaseLabels.includes("sonnet"))
                return "sonnet";
            if (lowercaseLabels.includes("haiku"))
                return "haiku";
            return undefined;
        };
        const agentFromDescription = descriptionAgentTagRaw?.toLowerCase();
        const resolvedAgentFromDescription = resolveRunnerFromName(agentFromDescription);
        const providerModelFromLabels = resolveProviderModelFromLabel(normalizedLabels);
        const resolvedAgentFromLabels = resolveAgentFromLabel(normalizedLabels);
        const modelFromDescription = descriptionModelTagRaw;
        const modelFromLabels = providerModelFromLabels?.model || resolveModelFromLabel(normalizedLabels);
        const explicitModel = modelFromDescription || modelFromLabels;
        const explicitAgent = resolvedAgentFromDescription ||
            providerModelFromLabels?.runnerType ||
            resolvedAgentFromLabels;
        const configuredRunner = this.getDefaultRunner();
        // omp serves every provider's models, so a bare model selector such as
        // `[model=sonnet]` must not silently route the session to the Claude
        // harness and ignore the configured default.
        const runnerType = explicitAgent ??
            (configuredRunner === "omp"
                ? "omp"
                : (inferRunnerFromModel(explicitModel) ?? configuredRunner));
        // If an explicit agent conflicts with model's implied runner, keep the agent and reset model.
        const modelRunner = runnerType === "omp" ? undefined : inferRunnerFromModel(explicitModel);
        let modelOverride = explicitModel;
        if (modelOverride && modelRunner && modelRunner !== runnerType) {
            modelOverride = undefined;
        }
        const selectedModel = modelOverride ||
            defaultModelByRunner[runnerType] ||
            this.getDefaultModelForRunner(runnerType);
        let selectedFallback = selectedModel
            ? inferFallbackModel(selectedModel, runnerType)
            : undefined;
        if (!selectedFallback) {
            selectedFallback = defaultFallbackByRunner[runnerType];
        }
        const forOmp = (model) => model && runnerType === "omp"
            ? (OMP_ALIAS_MODELS[model.toLowerCase()] ?? model)
            : model;
        return {
            runnerType,
            modelOverride: forOmp(selectedModel),
            fallbackModelOverride: forOmp(selectedFallback),
        };
    }
}
//# sourceMappingURL=RunnerSelectionService.js.map