import type { EdgeWorkerConfig, RunnerType } from "cyrus-core";
export declare class RunnerSelectionService {
    private config;
    constructor(config: EdgeWorkerConfig);
    /**
     * Update the internal config reference (e.g. after hot-reload).
     */
    setConfig(config: EdgeWorkerConfig): void;
    /**
     * Determine the default runner type.
     *
     * Priority:
     * 1. Explicit `defaultRunner` in config
     * 2. Auto-detect from available provider credentials (if exactly one runner has keys)
     * 3. Fall back to "claude"
     */
    getDefaultRunner(): RunnerType;
    /**
     * Resolve default model for a given runner from config with sensible built-in defaults.
     */
    getDefaultModelForRunner(runnerType: RunnerType): string | undefined;
    /**
     * Resolve default reasoning effort for the Claude runner.
     *
     * Returns undefined when unconfigured so the harness default stands, rather
     * than this service inventing one. Only Claude is covered; the other runners
     * carry their own reasoning controls.
     */
    getDefaultEffortForRunner(runnerType: RunnerType): string | undefined;
    /**
     * Resolve default fallback model for a given runner from config with sensible built-in defaults.
     * Supports legacy Claude fallback key for backwards compatibility.
     */
    getDefaultFallbackModelForRunner(runnerType: RunnerType): string | undefined;
    /**
     * Parse a bracketed tag from issue description.
     *
     * Supports escaped brackets (`\\[tag=value\\]`) which Linear can emit.
     */
    parseDescriptionTag(description: string, tagName: string): string | undefined;
    /**
     * Determine runner type and model using labels + issue description tags.
     *
     * Supported description tags:
     * - [agent=claude|gemini|codex|cursor|opencode]
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
    determineRunnerSelection(labels: string[], issueDescription?: string): {
        runnerType: RunnerType;
        modelOverride?: string;
        fallbackModelOverride?: string;
    };
}
//# sourceMappingURL=RunnerSelectionService.d.ts.map