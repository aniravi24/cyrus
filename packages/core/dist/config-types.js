import { homedir } from "node:os";
import { resolve } from "node:path";
// Re-export schemas and types from config-schemas
export { EdgeConfigPayloadSchema, EdgeConfigSchema, LinearWorkspaceConfigSchema, migrateEdgeConfig, NetworkPolicySchema, OpenCodeConfigSchema, OpenCodeStateScopeSchema, RepositoryConfigPayloadSchema, RepositoryConfigSchema, RunnerTypeSchema, requireLinearWorkspaceId, SandboxConfigSchema, UserAccessControlConfigSchema, UserIdentifierSchema, } from "./config-schemas.js";
export { TRUSTED_DOMAINS } from "./trusted-domains.js";
/**
 * Resolve path with tilde (~) expansion
 * Expands ~ to the user's home directory and resolves to absolute path
 *
 * @param path - Path that may contain ~ prefix (e.g., "~/.cyrus/repos/myrepo")
 * @returns Absolute path with ~ expanded
 *
 * @example
 * resolvePath("~/projects/myapp") // "/home/user/projects/myapp"
 * resolvePath("/absolute/path") // "/absolute/path"
 * resolvePath("relative/path") // "/current/working/dir/relative/path"
 */
export function resolvePath(path) {
    if (path.startsWith("~/")) {
        return resolve(homedir(), path.slice(2));
    }
    return resolve(path);
}
//# sourceMappingURL=config-types.js.map