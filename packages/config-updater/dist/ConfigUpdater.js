import { handleCheckGh } from "./handlers/checkGh.js";
import { handleCheckGlab } from "./handlers/checkGlab.js";
import { handleConfigureMcp } from "./handlers/configureMcp.js";
import { handleCyrusConfig } from "./handlers/cyrusConfig.js";
import { handleCyrusEnv } from "./handlers/cyrusEnv.js";
import { handleRepository, handleRepositoryDelete, } from "./handlers/repository.js";
import { handleDeleteSkill, handleListSkills, handleUpdateSkill, } from "./handlers/skills.js";
import { handleTestMcp } from "./handlers/testMcp.js";
/**
 * ConfigUpdater registers configuration update routes with a Fastify server
 * Handles: cyrus-config, cyrus-env, repository, update/test-mcp, update/configure-mcp, check-gh endpoints
 *
 * `getApiKey` is invoked on every auth check, so callers reading from
 * `process.env.CYRUS_API_KEY` pick up `.env` reloads (triggered by
 * `cyrus auth` after a credential rotation) without restarting the process.
 */
export class ConfigUpdater {
    fastify;
    cyrusHome;
    getApiKey;
    constructor(fastify, cyrusHome, getApiKey) {
        this.fastify = fastify;
        this.cyrusHome = cyrusHome;
        this.getApiKey = getApiKey;
    }
    /**
     * Register all configuration update routes with the Fastify instance
     */
    register() {
        // Register all routes with authentication
        this.registerRoute("/api/update/cyrus-config", this.handleCyrusConfigRoute);
        this.registerRoute("/api/update/cyrus-env", this.handleCyrusEnvRoute);
        this.registerRoute("/api/update/repository", this.handleRepositoryRoute);
        this.registerDeleteRoute("/api/update/repository", this.handleRepositoryDeleteRoute);
        this.registerRoute("/api/update/test-mcp", this.handleTestMcpRoute);
        this.registerRoute("/api/update/configure-mcp", this.handleConfigureMcpRoute);
        this.registerRoute("/api/check-gh", this.handleCheckGhRoute);
        this.registerRoute("/api/check-glab", this.handleCheckGlabRoute);
        this.registerRoute("/api/update/skill", this.handleUpdateSkillRoute);
        this.registerDeleteRoute("/api/update/skill", this.handleDeleteSkillRoute);
        this.registerGetRoute("/api/skills", this.handleListSkillsRoute);
    }
    /**
     * Register a route with authentication
     */
    registerRoute(path, handler) {
        this.fastify.post(path, async (request, reply) => {
            // Verify authentication
            const authHeader = request.headers.authorization;
            if (!this.verifyAuth(authHeader)) {
                return reply.status(401).send({
                    success: false,
                    error: "Unauthorized",
                });
            }
            try {
                const response = await handler.call(this, request.body);
                const statusCode = response.success ? 200 : 400;
                return reply.status(statusCode).send(response);
            }
            catch (error) {
                return reply.status(500).send({
                    success: false,
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }
    /**
     * Register a DELETE route with authentication
     */
    registerDeleteRoute(path, handler) {
        this.fastify.delete(path, async (request, reply) => {
            // Verify authentication
            const authHeader = request.headers.authorization;
            if (!this.verifyAuth(authHeader)) {
                return reply.status(401).send({
                    success: false,
                    error: "Unauthorized",
                });
            }
            try {
                const response = await handler.call(this, request.body);
                const statusCode = response.success ? 200 : 400;
                return reply.status(statusCode).send(response);
            }
            catch (error) {
                return reply.status(500).send({
                    success: false,
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }
    /**
     * Register a GET route with authentication
     */
    registerGetRoute(path, handler) {
        this.fastify.get(path, async (request, reply) => {
            // Verify authentication
            const authHeader = request.headers.authorization;
            if (!this.verifyAuth(authHeader)) {
                return reply.status(401).send({
                    success: false,
                    error: "Unauthorized",
                });
            }
            try {
                const response = await handler.call(this, request.query || {});
                const statusCode = response.success ? 200 : 400;
                return reply.status(statusCode).send(response);
            }
            catch (error) {
                return reply.status(500).send({
                    success: false,
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }
    /**
     * Verify Bearer token authentication
     */
    verifyAuth(authHeader) {
        const apiKey = this.getApiKey();
        if (!authHeader || !apiKey) {
            return false;
        }
        const expectedAuth = `Bearer ${apiKey}`;
        return authHeader === expectedAuth;
    }
    /**
     * Handle cyrus-config update
     */
    async handleCyrusConfigRoute(payload) {
        const response = await handleCyrusConfig(payload, this.cyrusHome);
        // Emit restart event if requested
        if (response.success && response.data?.restartCyrus) {
            this.fastify.log.info("Config update requested Cyrus restart");
        }
        return response;
    }
    /**
     * Handle cyrus-env update
     */
    async handleCyrusEnvRoute(payload) {
        const response = await handleCyrusEnv(payload, this.cyrusHome);
        // Emit restart event if requested
        if (response.success && response.data?.restartCyrus) {
            this.fastify.log.info("Env update requested Cyrus restart");
        }
        return response;
    }
    /**
     * Handle repository clone/verify
     */
    async handleRepositoryRoute(payload) {
        return handleRepository(payload, this.cyrusHome);
    }
    /**
     * Handle MCP connection test
     */
    async handleTestMcpRoute(payload) {
        return handleTestMcp(payload);
    }
    /**
     * Handle MCP server configuration
     */
    async handleConfigureMcpRoute(payload) {
        return handleConfigureMcp(payload, this.cyrusHome);
    }
    /**
     * Handle GitHub CLI check
     */
    async handleCheckGhRoute(payload) {
        return handleCheckGh(payload, this.cyrusHome);
    }
    /**
     * Handle GitLab CLI check
     */
    async handleCheckGlabRoute(payload) {
        return handleCheckGlab(payload, this.cyrusHome);
    }
    /**
     * Handle repository deletion
     */
    async handleRepositoryDeleteRoute(payload) {
        return handleRepositoryDelete(payload, this.cyrusHome);
    }
    /**
     * Handle creating or updating a user skill
     */
    async handleUpdateSkillRoute(payload) {
        return handleUpdateSkill(payload, this.cyrusHome);
    }
    /**
     * Handle deleting a user skill
     */
    async handleDeleteSkillRoute(payload) {
        return handleDeleteSkill(payload, this.cyrusHome);
    }
    /**
     * Handle listing user skills
     */
    async handleListSkillsRoute(payload) {
        return handleListSkills(payload, this.cyrusHome);
    }
}
//# sourceMappingURL=ConfigUpdater.js.map