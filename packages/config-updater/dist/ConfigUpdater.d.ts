import type { FastifyInstance } from "fastify";
/**
 * ConfigUpdater registers configuration update routes with a Fastify server
 * Handles: cyrus-config, cyrus-env, repository, update/test-mcp, update/configure-mcp, check-gh endpoints
 *
 * `getApiKey` is invoked on every auth check, so callers reading from
 * `process.env.CYRUS_API_KEY` pick up `.env` reloads (triggered by
 * `cyrus auth` after a credential rotation) without restarting the process.
 */
export declare class ConfigUpdater {
    private fastify;
    private cyrusHome;
    private getApiKey;
    constructor(fastify: FastifyInstance, cyrusHome: string, getApiKey: () => string);
    /**
     * Register all configuration update routes with the Fastify instance
     */
    register(): void;
    /**
     * Register a route with authentication
     */
    private registerRoute;
    /**
     * Register a DELETE route with authentication
     */
    private registerDeleteRoute;
    /**
     * Register a GET route with authentication
     */
    private registerGetRoute;
    /**
     * Verify Bearer token authentication
     */
    private verifyAuth;
    /**
     * Handle cyrus-config update
     */
    private handleCyrusConfigRoute;
    /**
     * Handle cyrus-env update
     */
    private handleCyrusEnvRoute;
    /**
     * Handle repository clone/verify
     */
    private handleRepositoryRoute;
    /**
     * Handle MCP connection test
     */
    private handleTestMcpRoute;
    /**
     * Handle MCP server configuration
     */
    private handleConfigureMcpRoute;
    /**
     * Handle GitHub CLI check
     */
    private handleCheckGhRoute;
    /**
     * Handle GitLab CLI check
     */
    private handleCheckGlabRoute;
    /**
     * Handle repository deletion
     */
    private handleRepositoryDeleteRoute;
    /**
     * Handle creating or updating a user skill
     */
    private handleUpdateSkillRoute;
    /**
     * Handle deleting a user skill
     */
    private handleDeleteSkillRoute;
    /**
     * Handle listing user skills
     */
    private handleListSkillsRoute;
}
//# sourceMappingURL=ConfigUpdater.d.ts.map