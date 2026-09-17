/** Agents resolve from the config dir, not PI_CODING_AGENT_DIR (that moves credential/session state). */
export declare function ompAgentsDir(env: Record<string, string | undefined>): string;
/**
 * `model: opus` becomes a pinned selector list, `effort` becomes `thinking-level`,
 * everything else carries through. Returns the names written; a missing directory
 * is not an error.
 */
export declare function stageOmpAgents(pluginPaths: ReadonlyArray<string>, env: Record<string, string | undefined>): string[];
//# sourceMappingURL=OmpAgentStager.d.ts.map