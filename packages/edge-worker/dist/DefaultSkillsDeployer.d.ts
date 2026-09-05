import type { ILogger } from "cyrus-core";
/**
 * Deploys bundled default skills to the cyrusHome directory.
 *
 * On first startup, copies all bundled skill directories from the package
 * into `~/.cyrus/cyrus-skills-plugin/skills/` so that users can inspect
 * and customize them. Subsequent startups skip the copy if the plugin
 * directory already exists.
 *
 * Single Responsibility: this class only handles the one-time deployment
 * of default skills from the package to the user's home directory.
 */
export declare class DefaultSkillsDeployer {
    private readonly cyrusHome;
    private readonly logger;
    private readonly bundledSkillsPath;
    private readonly deployedPluginPath;
    private readonly deployedSkillsPath;
    private readonly manifestDir;
    private readonly manifestPath;
    constructor(cyrusHome: string, logger: ILogger, bundledSkillsDir?: string);
    /**
     * Ensure default skills are deployed to cyrusHome.
     *
     * If `~/.cyrus/cyrus-skills-plugin/` does not exist, creates it and
     * copies all bundled skills into it. If it already exists, does nothing
     * — the user may have customized the skills.
     */
    ensureDeployed(): Promise<void>;
    private exists;
}
//# sourceMappingURL=DefaultSkillsDeployer.d.ts.map