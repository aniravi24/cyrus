import type { UserAccessControlConfig } from "cyrus-core";
/**
 * Result of an access check operation.
 */
export type AccessCheckResult = {
    allowed: true;
} | {
    allowed: false;
    reason: string;
};
/**
 * Default message shown when a user is blocked and blockBehavior is 'comment'.
 * Supports template variables:
 * - {{userName}} - The user's display name
 * - {{userId}} - The user's Linear ID
 */
export declare const DEFAULT_BLOCK_MESSAGE = "{{userName}}, you are not authorized to delegate issues to this agent.";
/**
 * User access control manager for Linear user whitelisting/blacklisting.
 *
 * Access Check Logic:
 * 1. Build effective blocklist: global blockedUsers + repo blockedUsers (union)
 * 2. Check if user matches any entry in effective blocklist -> BLOCKED
 * 3. Determine effective allowlist:
 *    - If repo has allowedUsers -> use repo allowlist only
 *    - Else if global has allowedUsers -> use global allowlist
 *    - Else -> no allowlist (everyone allowed)
 * 4. If effective allowlist exists and user NOT in it -> BLOCKED
 * 5. Otherwise -> ALLOWED
 */
export declare class UserAccessControl {
    private globalConfig;
    private repoConfigs;
    /**
     * Creates a new UserAccessControl instance.
     * @param globalConfig - Global access control configuration
     * @param repoConfigs - Map of repository ID to repository-specific access control config
     */
    constructor(globalConfig: UserAccessControlConfig | undefined, repoConfigs: Map<string, UserAccessControlConfig | undefined>);
    /**
     * Check if a user is allowed to delegate issues to a specific repository.
     * @param userId - The user's Linear ID
     * @param userEmail - The user's email address
     * @param repositoryId - The target repository ID
     * @returns AccessCheckResult indicating if access is allowed
     */
    checkAccess(userId: string | undefined, userEmail: string | undefined, repositoryId: string): AccessCheckResult;
    /**
     * Get the effective block behavior for a repository.
     * Repo config overrides global config.
     * @param repositoryId - The repository ID
     * @returns 'silent' or 'comment'
     */
    getBlockBehavior(repositoryId: string): "silent" | "comment";
    /**
     * Get the effective block message for a repository.
     * Repo config overrides global config.
     * @param repositoryId - The repository ID
     * @returns The block message to display
     */
    getBlockMessage(repositoryId: string): string;
    /**
     * Check if any access control is configured (either globally or for any repository).
     * Useful for short-circuiting when no access control is needed.
     * @returns true if any access control configuration exists
     */
    hasAnyConfiguration(): boolean;
}
//# sourceMappingURL=UserAccessControl.d.ts.map