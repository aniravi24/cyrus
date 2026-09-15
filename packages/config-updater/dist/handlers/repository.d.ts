import type { ApiResponse, DeleteRepositoryPayload, RepositoryPayload } from "../types.js";
/**
 * Handle repository cloning or verification
 * - Clones repositories to ~/.cyrus/repos/<repo-name> using GitHub CLI (gh)
 * - If repository exists, verify it's a git repo and do nothing
 * - If repository doesn't exist, clone it to ~/.cyrus/repos/<repo-name>
 */
export declare function handleRepository(payload: RepositoryPayload, cyrusHome: string): Promise<ApiResponse>;
/**
 * Handle repository deletion
 * - Removes repository directory from ~/.cyrus/repos/<repo-name>
 * - Removes worktrees from ~/.cyrus/workspaces/<linear-team-key>/<repo-name>
 */
export declare function handleRepositoryDelete(payload: DeleteRepositoryPayload, cyrusHome: string): Promise<ApiResponse>;
//# sourceMappingURL=repository.d.ts.map