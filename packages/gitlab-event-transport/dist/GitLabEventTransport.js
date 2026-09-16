import { EventEmitter } from "node:events";
import { createLogger, ipMatchesAllowlist } from "cyrus-core";
import { GitLabMessageTranslator } from "./GitLabMessageTranslator.js";
/**
 * GitLabEventTransport - Handles forwarded GitLab webhook event delivery
 *
 * This class provides a typed EventEmitter-based transport
 * for handling GitLab webhooks forwarded from CYHOST.
 *
 * It registers a POST /gitlab-webhook endpoint with a Fastify server
 * and verifies incoming webhooks using either:
 * 1. "proxy" mode: Verifies Bearer token authentication (self-hosted)
 * 2. "signature" mode: Verifies X-Gitlab-Token header (direct webhooks)
 *
 * Supported GitLab event types:
 * - note: Comments/notes on merge requests
 * - merge_request: MR state changes (approved, changes_requested, etc.)
 */
export class GitLabEventTransport extends EventEmitter {
    config;
    logger;
    messageTranslator;
    translationContext;
    constructor(config, logger, translationContext) {
        super();
        this.config = config;
        this.logger = logger ?? createLogger({ component: "GitLabEventTransport" });
        this.messageTranslator = new GitLabMessageTranslator();
        this.translationContext = translationContext ?? {};
    }
    /**
     * Set the translation context for message translation.
     */
    setTranslationContext(context) {
        this.translationContext = { ...this.translationContext, ...context };
    }
    /**
     * Resolve the effective verification mode and secret at request time.
     * When started in proxy mode, checks if GITLAB_WEBHOOK_SECRET and
     * CYRUS_HOST_EXTERNAL have been added to the environment since startup,
     * enabling a runtime switch to signature verification.
     */
    resolveVerification() {
        if (this.config.verificationMode === "signature") {
            return { mode: "signature", secret: this.config.secret };
        }
        const isExternalHost = process.env.CYRUS_HOST_EXTERNAL?.toLowerCase().trim() === "true";
        const gitlabSecret = process.env.GITLAB_WEBHOOK_SECRET;
        const hasGitlabSecret = gitlabSecret != null && gitlabSecret !== "";
        if (isExternalHost && hasGitlabSecret) {
            this.logger.info("Runtime switch: GITLAB_WEBHOOK_SECRET detected, using GitLab token verification");
            return { mode: "signature", secret: gitlabSecret };
        }
        return { mode: "proxy", secret: this.config.secret };
    }
    /**
     * Register the /gitlab-webhook endpoint with the Fastify server
     */
    register() {
        this.config.fastifyServer.post("/gitlab-webhook", async (request, reply) => {
            try {
                const { mode, secret } = this.resolveVerification();
                if (mode === "signature") {
                    await this.handleSignatureWebhook(request, reply, secret);
                }
                else {
                    await this.handleProxyWebhook(request, reply, secret);
                }
            }
            catch (error) {
                const err = new Error("Webhook error");
                if (error instanceof Error) {
                    err.cause = error;
                }
                this.logger.error("Webhook error", err);
                this.emit("error", err);
                reply.code(500).send({ error: "Internal server error" });
            }
        });
        this.logger.info(`Registered POST /gitlab-webhook endpoint (${this.config.verificationMode} mode)`);
    }
    /**
     * Handle webhook using GitLab's X-Gitlab-Token secret verification.
     * GitLab uses a simple token comparison (not HMAC).
     */
    async handleSignatureWebhook(request, reply, secret) {
        // Validate source IP against GitLab's known webhook IPs
        if (this.config.ipAllowlist &&
            this.config.ipAllowlist.length > 0 &&
            !ipMatchesAllowlist(request.ip, this.config.ipAllowlist)) {
            this.logger.warn(`Rejected GitLab webhook from unauthorized IP: ${request.ip}`);
            reply.code(403).send({ error: "Forbidden: unauthorized source IP" });
            return;
        }
        const token = request.headers["x-gitlab-token"];
        if (!token) {
            reply.code(401).send({ error: "Missing X-Gitlab-Token header" });
            return;
        }
        if (token !== secret) {
            reply.code(401).send({ error: "Invalid webhook token" });
            return;
        }
        this.processAndEmitEvent(request, reply);
    }
    /**
     * Handle webhook using Bearer token authentication (forwarded from CYHOST)
     */
    async handleProxyWebhook(request, reply, secret) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            reply.code(401).send({ error: "Missing Authorization header" });
            return;
        }
        const expectedAuth = `Bearer ${secret}`;
        if (authHeader !== expectedAuth) {
            reply.code(401).send({ error: "Invalid authorization token" });
            return;
        }
        this.processAndEmitEvent(request, reply);
    }
    /**
     * Process the webhook request and emit the appropriate event
     */
    processAndEmitEvent(request, reply) {
        const body = request.body;
        const objectKind = body.object_kind;
        const accessToken = request.headers["x-gitlab-access-token"];
        if (!objectKind) {
            reply.code(400).send({ error: "Missing object_kind in payload" });
            return;
        }
        if (objectKind !== "note" && objectKind !== "merge_request") {
            this.logger.debug(`Ignoring unsupported event type: ${objectKind}`);
            reply.code(200).send({ success: true, ignored: true });
            return;
        }
        const payload = body;
        // For note events, only handle notes on merge requests
        if (objectKind === "note") {
            const notePayload = payload;
            if (notePayload.object_attributes.noteable_type !== "MergeRequest") {
                this.logger.debug(`Ignoring note on ${notePayload.object_attributes.noteable_type}`);
                reply.code(200).send({ success: true, ignored: true });
                return;
            }
        }
        // For merge_request events, only handle specific actions
        if (objectKind === "merge_request") {
            const mrPayload = payload;
            const action = mrPayload.object_attributes.action;
            if (action !== "approved" && action !== "unapproved") {
                this.logger.debug(`Ignoring merge_request with action: ${action}`);
                reply.code(200).send({ success: true, ignored: true });
                return;
            }
        }
        const webhookEvent = {
            eventType: objectKind,
            payload,
            accessToken,
        };
        this.logger.info(`Received ${objectKind} webhook from ${payload.project.path_with_namespace}`);
        // Emit "event" for legacy compatibility
        this.emit("event", webhookEvent);
        // Emit "message" with translated internal message
        this.emitMessage(webhookEvent);
        reply.code(200).send({ success: true });
    }
    /**
     * Translate and emit an internal message from a webhook event.
     */
    emitMessage(event) {
        const result = this.messageTranslator.translate(event, this.translationContext);
        if (result.success) {
            this.emit("message", result.message);
        }
        else {
            this.logger.debug(`Message translation skipped: ${result.reason}`);
        }
    }
}
//# sourceMappingURL=GitLabEventTransport.js.map