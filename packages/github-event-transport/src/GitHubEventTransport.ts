import { createHmac, timingSafeEqual } from "node:crypto";
import { EventEmitter } from "node:events";
import type { TranslationContext } from "cyrus-core";
import { createLogger, type ILogger, ipMatchesAllowlist } from "cyrus-core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { forgeFlavor } from "./forge-flavor.js";
import { GitHubMessageTranslator } from "./GitHubMessageTranslator.js";
import type {
	GitHubEventTransportConfig,
	GitHubEventTransportEvents,
	GitHubEventType,
	GitHubIssueCommentPayload,
	GitHubPullRequestReviewCommentPayload,
	GitHubPullRequestReviewPayload,
	GitHubPushPayload,
	GitHubVerificationMode,
	GitHubWebhookEvent,
} from "./types.js";

export declare interface GitHubEventTransport {
	on<K extends keyof GitHubEventTransportEvents>(
		event: K,
		listener: GitHubEventTransportEvents[K],
	): this;
	emit<K extends keyof GitHubEventTransportEvents>(
		event: K,
		...args: Parameters<GitHubEventTransportEvents[K]>
	): boolean;
}

/**
 * GitHubEventTransport - Handles forwarded GitHub webhook event delivery
 *
 * This class provides a typed EventEmitter-based transport
 * for handling GitHub webhooks forwarded from CYHOST.
 *
 * It registers a POST /github-webhook endpoint with a Fastify server
 * and verifies incoming webhooks using either:
 * 1. "proxy" mode: Verifies Bearer token authentication (self-hosted)
 * 2. "signature" mode: Verifies GitHub's HMAC-SHA256 signature (cloud)
 *
 * Supported GitHub event types:
 * - issue_comment: Comments on PR issues (top-level PR comments)
 * - pull_request_review_comment: Inline review comments on PR diffs
 * - pull_request_review: PR review submissions (e.g., changes_requested)
 * - push: Branch push events (used for base branch change notifications)
 */
export class GitHubEventTransport extends EventEmitter {
	private config: GitHubEventTransportConfig;
	private logger: ILogger;
	private messageTranslator: GitHubMessageTranslator;
	private translationContext: TranslationContext;

	constructor(
		config: GitHubEventTransportConfig,
		logger?: ILogger,
		translationContext?: TranslationContext,
	) {
		super();
		this.config = config;
		this.logger = logger ?? createLogger({ component: "GitHubEventTransport" });
		this.messageTranslator = new GitHubMessageTranslator();
		this.translationContext = translationContext ?? {};
	}

	/**
	 * Set the translation context for message translation.
	 */
	setTranslationContext(context: TranslationContext): void {
		this.translationContext = { ...this.translationContext, ...context };
	}

	/**
	 * Resolve the effective verification mode and secret at request time.
	 * When started in proxy mode, checks if GITHUB_WEBHOOK_SECRET and
	 * CYRUS_HOST_EXTERNAL have been added to the environment since startup,
	 * enabling a runtime switch to signature verification.
	 *
	 * Encapsulates all mode-switch detection and logging so callers only
	 * need to dispatch on the returned mode (SRP).
	 */
	private resolveVerification(): {
		mode: GitHubVerificationMode;
		secret: string;
	} {
		// If already configured for signature mode at startup, keep using it
		if (this.config.verificationMode === "signature") {
			return { mode: "signature", secret: this.config.secret };
		}

		// Check if signature mode env vars have been added at runtime
		const isExternalHost =
			process.env.CYRUS_HOST_EXTERNAL?.toLowerCase().trim() === "true";
		// Either forge's secret enables signature mode. They are separate vars so
		// a deployment talking to both does not have to share one HMAC secret.
		const forgeSecret =
			process.env.FORGEJO_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
		const hasForgeSecret = forgeSecret != null && forgeSecret !== "";

		if (isExternalHost && hasForgeSecret) {
			this.logger.info(
				"Runtime switch: webhook secret detected, using signature verification",
			);
			return { mode: "signature", secret: forgeSecret };
		}

		// Fall back to proxy mode with original config secret
		return { mode: "proxy", secret: this.config.secret };
	}

	/**
	 * Register the webhook endpoint with the Fastify server
	 */
	/** Mount point, defaulting to the historical `/github-webhook`. */
	private get routePath(): string {
		return this.config.routePath ?? "/github-webhook";
	}

	register(): void {
		this.config.fastifyServer.post(
			this.routePath,
			{
				config: {
					rawBody: true,
				},
			},
			async (request: FastifyRequest, reply: FastifyReply) => {
				try {
					const { mode, secret } = this.resolveVerification();

					if (mode === "signature") {
						await this.handleSignatureWebhook(request, reply, secret);
					} else {
						await this.handleProxyWebhook(request, reply, secret);
					}
				} catch (error) {
					const err = new Error("Webhook error");
					if (error instanceof Error) {
						err.cause = error;
					}
					this.logger.error("Webhook error", err);
					this.emit("error", err);
					reply.code(500).send({ error: "Internal server error" });
				}
			},
		);

		this.logger.info(
			`Registered POST ${this.routePath} endpoint (${this.config.verificationMode} mode)`,
		);
	}

	/**
	 * Handle webhook using GitHub's HMAC-SHA256 signature verification
	 */
	private async handleSignatureWebhook(
		request: FastifyRequest,
		reply: FastifyReply,
		secret: string,
	): Promise<void> {
		// Validate source IP against GitHub's known webhook IPs
		if (
			this.config.ipAllowlist &&
			this.config.ipAllowlist.length > 0 &&
			!ipMatchesAllowlist(request.ip, this.config.ipAllowlist)
		) {
			this.logger.warn(
				`Rejected GitHub webhook from unauthorized IP: ${request.ip}`,
			);
			reply.code(403).send({ error: "Forbidden: unauthorized source IP" });
			return;
		}

		const { signatureHeader } = forgeFlavor(this.config.forge);
		const signature = request.headers[signatureHeader] as string;
		if (!signature) {
			reply.code(401).send({ error: `Missing ${signatureHeader} header` });
			return;
		}

		try {
			const body = (request as FastifyRequest & { rawBody: string }).rawBody;
			const isValid = this.verifyGitHubSignature(body, signature, secret);

			if (!isValid) {
				reply.code(401).send({ error: "Invalid webhook signature" });
				return;
			}

			this.processAndEmitEvent(request, reply);
		} catch (error) {
			const err = new Error("Signature verification failed");
			if (error instanceof Error) {
				err.cause = error;
			}
			this.logger.error("Signature verification failed", err);
			reply.code(401).send({ error: "Invalid webhook signature" });
		}
	}

	/**
	 * Handle webhook using Bearer token authentication (forwarded from CYHOST)
	 */
	private async handleProxyWebhook(
		request: FastifyRequest,
		reply: FastifyReply,
		secret: string,
	): Promise<void> {
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

		try {
			this.processAndEmitEvent(request, reply);
		} catch (error) {
			const err = new Error("Proxy webhook processing failed");
			if (error instanceof Error) {
				err.cause = error;
			}
			this.logger.error("Proxy webhook processing failed", err);
			reply.code(500).send({ error: "Failed to process webhook" });
		}
	}

	/**
	 * Process the webhook request and emit the appropriate event
	 */
	private processAndEmitEvent(
		request: FastifyRequest,
		reply: FastifyReply,
	): void {
		const { eventHeader } = forgeFlavor(this.config.forge);
		const eventType = request.headers[eventHeader] as string;
		// Forgejo sends x-gitea-delivery; fall back so either forge yields an id.
		const deliveryId =
			(request.headers["x-github-delivery"] as string) ||
			(request.headers["x-gitea-delivery"] as string) ||
			"unknown";
		const installationToken = request.headers["x-github-installation-token"] as
			| string
			| undefined;

		if (!eventType) {
			reply.code(400).send({ error: `Missing ${eventHeader} header` });
			return;
		}

		if (
			eventType !== "issue_comment" &&
			eventType !== "pull_request_review_comment" &&
			eventType !== "pull_request_review" &&
			eventType !== "push"
		) {
			this.logger.debug(`Ignoring unsupported event type: ${eventType}`);
			reply.code(200).send({ success: true, ignored: true });
			return;
		}

		const payload = request.body as
			| GitHubIssueCommentPayload
			| GitHubPullRequestReviewCommentPayload
			| GitHubPullRequestReviewPayload
			| GitHubPushPayload;

		// Push events don't have an action field — always emit them
		if (eventType === "push") {
			// No action filtering needed for push events
		} else if (eventType === "pull_request_review") {
			// For pull_request_review, handle 'submitted' action (not 'created')
			if ((payload as GitHubPullRequestReviewPayload).action !== "submitted") {
				this.logger.debug(
					`Ignoring ${eventType} with action: ${(payload as GitHubPullRequestReviewPayload).action}`,
				);
				reply.code(200).send({ success: true, ignored: true });
				return;
			}
		} else if ((payload as GitHubIssueCommentPayload).action !== "created") {
			// For issue_comment and pull_request_review_comment, only handle 'created'
			this.logger.debug(
				`Ignoring ${eventType} with action: ${(payload as GitHubIssueCommentPayload).action}`,
			);
			reply.code(200).send({ success: true, ignored: true });
			return;
		}

		const webhookEvent: GitHubWebhookEvent = {
			eventType: eventType as GitHubEventType,
			deliveryId,
			payload,
			installationToken,
		};

		this.logger.info(`Received ${eventType} webhook (delivery: ${deliveryId})`);

		// Emit "event" for legacy compatibility
		this.emit("event", webhookEvent);

		// Emit "message" with translated internal message
		this.emitMessage(webhookEvent);

		reply.code(200).send({ success: true });
	}

	/**
	 * Translate and emit an internal message from a webhook event.
	 * Only emits if translation succeeds; logs debug message on failure.
	 */
	private emitMessage(event: GitHubWebhookEvent): void {
		const result = this.messageTranslator.translate(
			event,
			this.translationContext,
		);

		if (result.success) {
			this.emit("message", result.message);
		} else {
			this.logger.debug(`Message translation skipped: ${result.reason}`);
		}
	}

	/**
	 * Verify the webhook signature using HMAC-SHA256 over the RAW body.
	 *
	 * GitHub prefixes the hex digest with `sha256=`; Forgejo sends it bare. The
	 * length check below is what makes timingSafeEqual safe to call, so the
	 * prefix must be applied before comparing, not stripped after.
	 */
	private verifyGitHubSignature(
		body: string,
		signature: string,
		secret: string,
	): boolean {
		const expectedSignature = forgeFlavor(this.config.forge).signatureValue(
			createHmac("sha256", secret).update(body).digest("hex"),
		);

		if (signature.length !== expectedSignature.length) {
			return false;
		}

		return timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(expectedSignature),
		);
	}
}
