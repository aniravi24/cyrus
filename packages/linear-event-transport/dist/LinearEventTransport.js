import { EventEmitter } from "node:events";
import { LinearWebhookClient, } from "@linear/sdk/webhooks";
import { createLogger, ipMatchesAllowlist } from "cyrus-core";
import { LinearMessageTranslator } from "./LinearMessageTranslator.js";
/**
 * LinearEventTransport - Handles Linear webhook event delivery
 *
 * This class implements IAgentEventTransport to provide a platform-agnostic
 * interface for handling Linear webhooks with Linear-specific verification.
 *
 * It registers a POST /linear-webhook endpoint with a Fastify server, plus
 * a POST /webhook alias retained for backward compatibility (deprecated).
 * Incoming webhooks are verified using either:
 * 1. "direct" mode: Verifies Linear's webhook signature
 * 2. "proxy" mode: Verifies Bearer token authentication
 *
 * The class emits "event" events with AgentEvent (LinearWebhookPayload) data.
 */
export class LinearEventTransport extends EventEmitter {
    config;
    linearWebhookClient = null;
    logger;
    messageTranslator;
    translationContext;
    constructor(config, logger, translationContext) {
        super();
        this.config = config;
        this.logger = logger ?? createLogger({ component: "LinearEventTransport" });
        this.messageTranslator = new LinearMessageTranslator();
        this.translationContext = translationContext ?? {};
        // Initialize Linear webhook client for direct mode
        if (config.verificationMode === "direct") {
            this.linearWebhookClient = new LinearWebhookClient(config.secret);
        }
    }
    /**
     * Set the translation context for message translation.
     * This allows setting Linear API tokens and other context after construction.
     */
    setTranslationContext(context) {
        this.translationContext = { ...this.translationContext, ...context };
    }
    /**
     * Register the /linear-webhook endpoint (plus the deprecated /webhook alias)
     * with the Fastify server.
     */
    register() {
        const handler = async (request, reply) => {
            try {
                // Verify based on mode
                if (this.config.verificationMode === "direct") {
                    await this.handleDirectWebhook(request, reply);
                }
                else {
                    await this.handleProxyWebhook(request, reply);
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
        };
        this.config.fastifyServer.post("/linear-webhook", handler);
        // Deprecated alias — retained so existing Linear webhook configurations
        // continue to deliver while users migrate to /linear-webhook.
        let deprecationWarned = false;
        this.config.fastifyServer.post("/webhook", async (request, reply) => {
            if (!deprecationWarned) {
                deprecationWarned = true;
                this.logger.warn("POST /webhook is deprecated; update your Linear webhook URL to use /linear-webhook");
            }
            await handler(request, reply);
        });
        this.logger.info(`Registered POST /linear-webhook endpoint (${this.config.verificationMode} mode); POST /webhook retained as deprecated alias`);
    }
    /**
     * Handle webhook in direct mode using Linear's signature verification
     */
    async handleDirectWebhook(request, reply) {
        if (!this.linearWebhookClient) {
            reply.code(500).send({ error: "Linear webhook client not initialized" });
            return;
        }
        // Validate source IP against Linear's known webhook IPs
        if (this.config.ipAllowlist &&
            this.config.ipAllowlist.length > 0 &&
            !ipMatchesAllowlist(request.ip, this.config.ipAllowlist)) {
            this.logger.warn(`Rejected Linear webhook from unauthorized IP: ${request.ip}`);
            reply.code(403).send({ error: "Forbidden: unauthorized source IP" });
            return;
        }
        // Get Linear signature from headers
        const signature = request.headers["linear-signature"];
        if (!signature) {
            reply.code(401).send({ error: "Missing linear-signature header" });
            return;
        }
        try {
            // Use the raw body bytes that SharedApplicationServer stashed on the request
            // so signature verification uses the exact payload Linear signed, rather than
            // a re-serialized version that may differ in key order or whitespace.
            const rawBody = request.rawBody;
            const bodyBuffer = rawBody
                ? Buffer.from(rawBody)
                : Buffer.from(JSON.stringify(request.body));
            const isValid = this.linearWebhookClient.verify(bodyBuffer, signature);
            if (!isValid) {
                reply.code(401).send({ error: "Invalid webhook signature" });
                return;
            }
            const payload = request.body;
            // Emit "event" for legacy IAgentEventTransport compatibility
            this.emit("event", payload);
            // Emit "message" with translated internal message
            this.emitMessage(payload);
            // Send success response
            reply.code(200).send({ success: true });
        }
        catch (error) {
            const err = new Error("Direct webhook verification failed");
            if (error instanceof Error) {
                err.cause = error;
            }
            this.logger.error("Direct webhook verification failed", err);
            reply.code(401).send({ error: "Invalid webhook signature" });
        }
    }
    /**
     * Handle webhook in proxy mode using Bearer token authentication
     */
    async handleProxyWebhook(request, reply) {
        // Get Authorization header
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            reply.code(401).send({ error: "Missing Authorization header" });
            return;
        }
        // Verify Bearer token
        const expectedAuth = `Bearer ${this.config.secret}`;
        if (authHeader !== expectedAuth) {
            reply.code(401).send({ error: "Invalid authorization token" });
            return;
        }
        try {
            const payload = request.body;
            // Emit "event" for legacy IAgentEventTransport compatibility
            this.emit("event", payload);
            // Emit "message" with translated internal message
            this.emitMessage(payload);
            // Send success response
            reply.code(200).send({ success: true });
        }
        catch (error) {
            const err = new Error("Proxy webhook processing failed");
            if (error instanceof Error) {
                err.cause = error;
            }
            this.logger.error("Proxy webhook processing failed", err);
            reply.code(500).send({ error: "Failed to process webhook" });
        }
    }
    /**
     * Translate and emit an internal message from a webhook payload.
     * Only emits if translation succeeds; logs debug message on failure.
     */
    emitMessage(payload) {
        const result = this.messageTranslator.translate(payload, this.translationContext);
        if (result.success) {
            this.emit("message", result.message);
        }
        else {
            this.logger.debug(`Message translation skipped: ${result.reason}`);
        }
    }
}
//# sourceMappingURL=LinearEventTransport.js.map