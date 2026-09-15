import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { AppServerCodexBackend } from "./backend/AppServerCodexBackend.js";
import { CodexEventMapper } from "./CodexEventMapper.js";
import { CodexSkillStager } from "./CodexSkillStager.js";
import { CodexConfigBuilder } from "./config/CodexConfigBuilder.js";
import { CodexMessageFormatter } from "./formatter.js";
/**
 * Adapts Codex to Cyrus's {@link IAgentRunner} contract.
 *
 * The runner is a thin orchestrator: it owns session lifecycle and delegates
 * configuration assembly ({@link CodexConfigBuilder}), skill staging
 * ({@link CodexSkillStager}), event→message mapping ({@link CodexEventMapper}),
 * and transport ({@link CodexBackend}) to dedicated collaborators. Codex is
 * driven exclusively through the app-server backend, which supports mid-turn
 * input injection (`turn/steer`).
 */
export class CodexRunner extends EventEmitter {
    supportsStreamingInput = true;
    config;
    formatter;
    skillStager;
    mapper;
    sessionInfo = null;
    backend = null;
    wasStopped = false;
    /** Set once the turn reaches a terminal state; gates {@link isStreaming}. */
    turnFinished = false;
    /**
     * Follow-up messages that arrived before the turn became steerable (during
     * config build / process spawn / thread start). Flushed via `steer` once the
     * turn starts, so a fast follow-up is never lost or wrongly deferred.
     */
    pendingFollowups = [];
    constructor(config) {
        super();
        this.config = config;
        this.formatter = new CodexMessageFormatter();
        this.skillStager = new CodexSkillStager({
            workingDirectory: config.workingDirectory,
            additionalDirectories: config.additionalDirectories,
            skills: config.skills,
            plugins: config.plugins,
        });
        this.mapper = new CodexEventMapper(this.buildMapperContext());
        if (config.onMessage)
            this.on("message", config.onMessage);
        if (config.onError)
            this.on("error", config.onError);
        if (config.onComplete)
            this.on("complete", config.onComplete);
    }
    async start(prompt) {
        return this.startWithPrompt(prompt);
    }
    async startStreaming(initialPrompt) {
        return this.startWithPrompt(initialPrompt);
    }
    /**
     * Inject a message mid-session. While a turn is steerable it is sent
     * immediately (`turn/steer`); during the startup window (before the turn
     * begins) it is buffered and flushed once the turn starts. Throws only once
     * the turn has finished, where the caller should resume with a new turn.
     */
    addStreamMessage(content) {
        if (this.backend?.isTurnActive()) {
            this.steer(content);
            return;
        }
        if (this.isRunning() && !this.turnFinished) {
            this.pendingFollowups.push(content);
            return;
        }
        throw new Error("Cannot stream message: no active Codex turn");
    }
    completeStream() {
        // No-op: each turn's input is delivered up front (or via steer); there is
        // no open input stream to close.
    }
    isStreaming() {
        // True for the whole running, not-yet-finished window — including the
        // startup gap before the turn is active — so callers stream follow-ups in
        // (buffered if needed) rather than deferring them.
        return (this.supportsStreamingInput && this.isRunning() && !this.turnFinished);
    }
    stop() {
        if (this.sessionInfo?.isRunning) {
            this.wasStopped = true;
        }
        this.cleanupRuntimeState();
    }
    isRunning() {
        return this.sessionInfo?.isRunning ?? false;
    }
    getMessages() {
        return this.mapper.getMessages();
    }
    getFormatter() {
        return this.formatter;
    }
    // ---- internals ----------------------------------------------------------
    async startWithPrompt(prompt) {
        if (this.isRunning()) {
            throw new Error("Codex session already running");
        }
        this.sessionInfo = {
            sessionId: this.config.resumeSessionId || crypto.randomUUID(),
            startedAt: new Date(),
            isRunning: true,
        };
        this.wasStopped = false;
        this.turnFinished = false;
        this.pendingFollowups = [];
        this.mapper.reset();
        // Create the backend up front (before the slow config build / process
        // spawn) so addStreamMessage can buffer follow-ups that arrive during the
        // startup window rather than throwing.
        const backend = this.createBackend();
        this.backend = backend;
        backend.on("event", (event) => this.handleBackendEvent(event));
        const resolved = await new CodexConfigBuilder(this.config).build();
        this.skillStager.stage();
        const input = prompt?.trim()
            ? [{ type: "text", text: prompt.trim() }]
            : [];
        let caughtError;
        try {
            await backend.open(resolved);
            await backend.runTurn(input);
        }
        catch (error) {
            caughtError = error;
        }
        finally {
            this.finalizeSession(caughtError);
        }
        return this.sessionInfo;
    }
    createBackend() {
        return new AppServerCodexBackend();
    }
    handleBackendEvent(event) {
        if (event.kind === "turn-started") {
            // Turn is now steerable — deliver anything buffered during startup.
            this.flushPendingFollowups();
        }
        else if (event.kind === "turn-completed" ||
            event.kind === "turn-failed") {
            this.turnFinished = true;
        }
        this.mapper.handle(event);
    }
    steer(content) {
        void this.backend
            ?.steer?.([{ type: "text", text: content }])
            .catch((error) => {
            this.emit("error", error instanceof Error ? error : new Error(String(error)));
        });
    }
    flushPendingFollowups() {
        const queued = this.pendingFollowups;
        this.pendingFollowups = [];
        for (const content of queued) {
            this.steer(content);
        }
    }
    buildMapperContext() {
        const self = this;
        return {
            get workingDirectory() {
                return self.config.workingDirectory;
            },
            get model() {
                return self.config.model;
            },
            getSessionId: () => self.sessionInfo?.sessionId || "pending",
            getStagedSkillNames: () => self.skillStager.getStagedSkillNames(),
            emitMessage: (message) => self.emit("message", message),
            onThreadStarted: (threadId) => {
                if (self.sessionInfo) {
                    self.sessionInfo.sessionId = threadId;
                }
            },
        };
    }
    finalizeSession(caughtError) {
        if (!this.sessionInfo) {
            this.cleanupRuntimeState();
            return;
        }
        this.sessionInfo.isRunning = false;
        const messages = this.mapper.finalize({
            caughtError,
            wasStopped: this.wasStopped,
        });
        this.emit("complete", messages);
        this.cleanupRuntimeState();
    }
    cleanupRuntimeState() {
        const backend = this.backend;
        this.backend = null;
        if (backend) {
            void backend.close();
        }
        this.skillStager.cleanup();
    }
}
//# sourceMappingURL=CodexRunner.js.map