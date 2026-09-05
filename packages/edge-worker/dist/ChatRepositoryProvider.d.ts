import type { RepositoryConfig } from "cyrus-core";
/**
 * Abstraction for accessing the current set of chat-accessible repositories.
 *
 * SlackChatAdapter and ChatSessionHandler depend on this interface rather than
 * a frozen array, so they always read the live repository state at the moment
 * a session is built — no refresh/notification wiring needed.
 */
export interface ChatRepositoryProvider {
    /** Current repository paths available for chat sessions */
    getRepositoryPaths(): string[];
    /** Default repository for MCP config sourcing (V1: first available) */
    getDefaultRepository(): RepositoryConfig | undefined;
    /** Default Linear workspace ID for MCP config (V1: first configured) */
    getDefaultLinearWorkspaceId(): string | undefined;
}
/**
 * Live implementation backed by EdgeWorker's repository map and config.
 *
 * Reads are computed on demand from the underlying collections, so any
 * runtime config changes (add/update/remove) are automatically visible
 * to the next chat session without explicit notification.
 */
export declare class LiveChatRepositoryProvider implements ChatRepositoryProvider {
    private readonly repositories;
    private readonly getLinearWorkspaces;
    constructor(repositories: Map<string, RepositoryConfig>, getLinearWorkspaces: () => Record<string, unknown>);
    getRepositoryPaths(): string[];
    getDefaultRepository(): RepositoryConfig | undefined;
    getDefaultLinearWorkspaceId(): string | undefined;
}
//# sourceMappingURL=ChatRepositoryProvider.d.ts.map