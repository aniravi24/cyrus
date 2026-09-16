/**
 * Structural subset of the SDK plugin config we read here. Typed locally to
 * avoid a direct dependency on the Claude Agent SDK from this package.
 */
interface LocalPluginLike {
    type?: string;
    path?: unknown;
}
/** Inputs the skill stager needs from a runner config. */
export interface SkillStagingInput {
    workingDirectory?: string;
    additionalDirectories?: string[];
    skills?: string[] | "all";
    plugins?: LocalPluginLike[];
}
/**
 * Stages managed + repo-local skills into Codex's native repository skill
 * discovery layout (`<workingDirectory>/.agents/skills/<name>` symlinks) before
 * a run, and removes them afterwards. Single responsibility: skill symlink
 * lifecycle. Holds no session state.
 */
export declare class CodexSkillStager {
    private readonly input;
    private stagedSkillPaths;
    private stagedSkillNames;
    constructor(input: SkillStagingInput);
    /** Names of skills currently staged (for the session init message). */
    getStagedSkillNames(): string[];
    /** Stage allowed skills as symlinks. Idempotent: clears prior staging first. */
    stage(): void;
    /** Remove all staged skill symlinks. Best-effort; never throws. */
    cleanup(): void;
    private discoverSkillSources;
    private resolveManagedSkillsRoot;
    private ensureManagedSkillsIgnored;
    private getRepoLocalSkillRoots;
    private readSkillSources;
    private stageSkillDirectory;
    private isStagedSkillPath;
}
export {};
//# sourceMappingURL=CodexSkillStager.d.ts.map