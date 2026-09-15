/**
 * omp's user agents directory.
 *
 * Agents resolve from the *config* dir (`~/.omp/agent/agents`), not from
 * `PI_CODING_AGENT_DIR` - that override relocates credential and session state
 * only, and staging into it leaves the definitions undiscovered.
 */
export declare function ompAgentsDir(env: Record<string, string | undefined>): string;
/**
 * Translate every plugin agent definition into omp's contract.
 *
 * - `model: opus` becomes a pinned, prioritized selector list
 * - `effort: high` becomes omp's `thinking-level`
 * - everything else is carried through untouched
 *
 * Returns the agent names written. Missing directories are not an error: a
 * session whose config ships no plugins simply has no agents to stage.
 */
export declare function stageOmpAgents(pluginPaths: ReadonlyArray<string>, env: Record<string, string | undefined>): string[];
//# sourceMappingURL=OmpAgentStager.d.ts.map