/**
 * Live implementation backed by EdgeWorker's repository map and config.
 *
 * Reads are computed on demand from the underlying collections, so any
 * runtime config changes (add/update/remove) are automatically visible
 * to the next chat session without explicit notification.
 */
export class LiveChatRepositoryProvider {
    repositories;
    getLinearWorkspaces;
    constructor(repositories, getLinearWorkspaces) {
        this.repositories = repositories;
        this.getLinearWorkspaces = getLinearWorkspaces;
    }
    getRepositoryPaths() {
        return Array.from(this.repositories.values()).map((repo) => repo.repositoryPath);
    }
    getDefaultRepository() {
        return Array.from(this.repositories.values())[0];
    }
    getDefaultLinearWorkspaceId() {
        return Object.keys(this.getLinearWorkspaces())[0];
    }
}
//# sourceMappingURL=ChatRepositoryProvider.js.map