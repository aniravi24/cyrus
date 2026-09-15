/**
 * Linear Message Translator
 *
 * Translates Linear webhook payloads into unified internal messages for the
 * internal message bus.
 *
 * @module linear-event-transport/LinearMessageTranslator
 */
import { randomUUID } from "node:crypto";
import { isAgentSessionCreatedWebhook, isAgentSessionPromptedWebhook, isIssueDeletedWebhook, isIssueStateChangeWebhook, isIssueTitleOrDescriptionUpdateWebhook, isIssueUnassignedWebhook, } from "cyrus-core";
/**
 * Translates Linear webhook payloads into internal messages.
 */
export class LinearMessageTranslator {
    /**
     * Check if this translator can handle the given webhook.
     */
    canTranslate(webhook) {
        if (!webhook || typeof webhook !== "object") {
            return false;
        }
        const w = webhook;
        // Linear webhooks have specific type/action combinations
        return (typeof w.type === "string" &&
            typeof w.action === "string" &&
            (w.type === "AgentSessionEvent" ||
                w.type === "AppUserNotification" ||
                w.type === "Issue"));
    }
    /**
     * Translate a Linear webhook into an internal message.
     */
    translate(webhook, context) {
        // Cast to our Webhook union type for type guards
        const w = webhook;
        if (isAgentSessionCreatedWebhook(w)) {
            return this.translateAgentSessionCreated(w, context);
        }
        if (isAgentSessionPromptedWebhook(w)) {
            return this.translateAgentSessionPrompted(w, context);
        }
        if (isIssueUnassignedWebhook(w)) {
            return this.translateIssueUnassigned(w, context);
        }
        if (isIssueStateChangeWebhook(w)) {
            return this.translateIssueStateChange(w, context);
        }
        if (isIssueDeletedWebhook(w)) {
            return this.translateIssueDeleted(w, context);
        }
        if (isIssueTitleOrDescriptionUpdateWebhook(w)) {
            return this.translateIssueUpdate(w, context);
        }
        return {
            success: false,
            reason: `Unsupported webhook type: ${webhook.type}/${webhook.action}`,
        };
    }
    /**
     * Translate AgentSessionCreatedWebhook to SessionStartMessage.
     */
    translateAgentSessionCreated(webhook, context) {
        const { agentSession, guidance, organizationId, createdAt } = webhook;
        if (!agentSession.issue) {
            return {
                success: false,
                reason: "AgentSessionCreated webhook missing issue data",
            };
        }
        const issue = agentSession.issue;
        const comment = agentSession.comment;
        // Determine initial prompt from comment body
        const AGENT_SESSION_MARKER = "This thread is for an agent session";
        const commentBody = comment?.body;
        const isMentionTriggered = commentBody && !commentBody.includes(AGENT_SESSION_MARKER);
        const initialPrompt = isMentionTriggered
            ? (commentBody ?? "")
            : (issue.description ?? "");
        // Build platform data
        const platformData = {
            agentSession: this.buildAgentSessionRef(agentSession),
            issue: this.buildIssueRef(issue),
            comment: comment
                ? this.buildCommentRef(comment)
                : undefined,
            guidance: guidance?.map((g) => this.buildGuidanceItem(g)),
            isMentionTriggered: !!isMentionTriggered,
            linearApiToken: context?.linearApiToken,
        };
        // Extract labels if available
        const issueWithLabels = issue;
        const labels = Array.isArray(issueWithLabels.labels)
            ? issueWithLabels.labels.map((l) => String(l.name || ""))
            : undefined;
        const message = {
            id: randomUUID(),
            source: "linear",
            action: "session_start",
            receivedAt: this.toISOString(createdAt),
            organizationId,
            sessionKey: agentSession.id,
            workItemId: issue.id,
            workItemIdentifier: issue.identifier,
            author: this.extractAuthorFromSession(agentSession),
            initialPrompt,
            title: issue.title,
            description: issue.description ?? undefined,
            labels,
            platformData,
        };
        return { success: true, message };
    }
    /**
     * Translate AgentSessionPromptedWebhook to UserPromptMessage or StopSignalMessage.
     */
    translateAgentSessionPrompted(webhook, _context) {
        const { agentSession, agentActivity, organizationId, createdAt } = webhook;
        if (!agentSession.issue) {
            return {
                success: false,
                reason: "AgentSessionPrompted webhook missing issue data",
            };
        }
        // Check if this is a stop signal
        if (agentActivity?.signal === "stop") {
            return this.translateStopSignal(webhook);
        }
        const issue = agentSession.issue;
        // Extract content from agentActivity
        const content = agentActivity?.content?.body ?? "";
        // Build platform data
        const platformData = {
            agentActivity: this.buildAgentActivityRef(agentActivity),
            agentSession: this.buildAgentSessionRef(agentSession),
        };
        const message = {
            id: randomUUID(),
            source: "linear",
            action: "user_prompt",
            receivedAt: this.toISOString(createdAt),
            organizationId,
            sessionKey: agentSession.id,
            workItemId: issue.id,
            workItemIdentifier: issue.identifier,
            author: this.extractAuthorFromActivity(agentActivity),
            content,
            platformData,
        };
        return { success: true, message };
    }
    /**
     * Translate AgentSessionPromptedWebhook with stop signal to StopSignalMessage.
     */
    translateStopSignal(webhook) {
        const { agentSession, agentActivity, organizationId, createdAt } = webhook;
        if (!agentSession.issue) {
            return {
                success: false,
                reason: "Stop signal webhook missing issue data",
            };
        }
        const issue = agentSession.issue;
        // Build platform data
        const platformData = {
            agentActivity: this.buildAgentActivityRef(agentActivity),
            agentSession: this.buildAgentSessionRef(agentSession),
        };
        const message = {
            id: randomUUID(),
            source: "linear",
            action: "stop_signal",
            receivedAt: this.toISOString(createdAt),
            organizationId,
            sessionKey: agentSession.id,
            workItemId: issue.id,
            workItemIdentifier: issue.identifier,
            platformData,
        };
        return { success: true, message };
    }
    /**
     * Translate IssueUnassignedWebhook to UnassignMessage.
     */
    translateIssueUnassigned(webhook, _context) {
        const { notification, organizationId, createdAt } = webhook;
        const issue = notification.issue;
        if (!issue) {
            return {
                success: false,
                reason: "IssueUnassigned webhook missing issue data",
            };
        }
        // Build platform data
        const platformData = {
            issue: this.buildIssueRef(issue),
            issueUrl: issue.url,
        };
        const message = {
            id: randomUUID(),
            source: "linear",
            action: "unassign",
            receivedAt: this.toISOString(createdAt),
            organizationId,
            // For unassign, we don't have a session key, use issue ID
            sessionKey: issue.id,
            workItemId: issue.id,
            workItemIdentifier: issue.identifier,
            platformData,
        };
        return { success: true, message };
    }
    /**
     * Translate IssueUpdateWebhook to ContentUpdateMessage.
     */
    translateIssueUpdate(webhook, _context) {
        const { data: issueData, updatedFrom, organizationId, createdAt } = webhook;
        if (!updatedFrom) {
            return {
                success: false,
                reason: "IssueUpdate webhook missing updatedFrom data",
            };
        }
        // Build changes object
        const changes = {};
        if ("title" in updatedFrom) {
            changes.previousTitle = updatedFrom.title;
            changes.newTitle = issueData.title;
        }
        if ("description" in updatedFrom) {
            changes.previousDescription = updatedFrom.description;
            changes.newDescription = issueData.description ?? undefined;
        }
        if ("attachments" in updatedFrom) {
            changes.attachmentsChanged = true;
        }
        // Build platform data
        const platformData = {
            issue: this.buildIssueRef(issueData),
            updatedFrom,
        };
        const message = {
            id: randomUUID(),
            source: "linear",
            action: "content_update",
            receivedAt: this.toISOString(createdAt),
            organizationId,
            // For content updates, we don't have a session key, use issue ID
            sessionKey: issueData.id,
            workItemId: issueData.id,
            workItemIdentifier: issueData.identifier,
            changes,
            platformData,
        };
        return { success: true, message };
    }
    /**
     * Translate IssueStateChangeWebhook (AppUserNotification/issueStatusChanged) to IssueStateChangeMessage.
     *
     * Linear sends these notifications for terminal state changes (completed/canceled).
     * The notification payload does not include state info — only the issue reference.
     */
    translateIssueStateChange(webhook, _context) {
        const { notification, organizationId, createdAt } = webhook;
        const issue = notification.issue;
        if (!issue) {
            return {
                success: false,
                reason: "IssueStateChange webhook missing issue data",
            };
        }
        return this.buildTerminalStateMessage(issue, organizationId, createdAt);
    }
    /**
     * Translate IssueDeletedWebhook (Issue/remove) to IssueStateChangeMessage.
     *
     * A deleted issue is effectively terminal — the same cleanup
     * (stop sessions, delete worktrees) should occur.
     */
    translateIssueDeleted(webhook, _context) {
        const { data: issueData, organizationId, createdAt } = webhook;
        if (!issueData) {
            return {
                success: false,
                reason: "IssueDeleted webhook missing issue data",
            };
        }
        return this.buildTerminalStateMessage(issueData, organizationId, createdAt);
    }
    /**
     * Build an IssueStateChangeMessage for an issue that has reached a terminal state.
     * Shared by state change (completed/canceled) and deletion translations.
     */
    buildTerminalStateMessage(issueData, organizationId, createdAt) {
        const platformData = {
            issue: this.buildIssueRef(issueData),
        };
        const message = {
            id: randomUUID(),
            source: "linear",
            action: "issue_state_change",
            receivedAt: this.toISOString(createdAt),
            organizationId,
            sessionKey: issueData.id,
            workItemId: issueData.id,
            workItemIdentifier: issueData.identifier,
            isTerminal: true,
            platformData,
        };
        return { success: true, message };
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    /**
     * Convert createdAt (Date or string) to ISO string.
     */
    toISOString(value) {
        if (!value)
            return new Date().toISOString();
        if (typeof value === "string")
            return value;
        return value.toISOString();
    }
    /**
     * Build agent session reference from webhook data.
     */
    buildAgentSessionRef(session) {
        const sessionRaw = session;
        const issueRaw = session.issue;
        return {
            id: session.id,
            status: session.status,
            type: session.type ?? undefined,
            externalLink: sessionRaw.externalLink ?? undefined,
            creatorId: session.creatorId ?? undefined,
            comment: session.comment
                ? {
                    id: session.comment.id,
                    body: session.comment.body ?? undefined,
                }
                : undefined,
            issue: issueRaw ? this.buildIssueRef(issueRaw) : this.emptyIssueRef(),
        };
    }
    /**
     * Build issue reference from webhook issue data.
     * Uses SafeRecord to handle fields that may not exist in all webhook types.
     */
    buildIssueRef(issue) {
        const team = issue.team;
        const project = issue.project;
        const labels = issue.labels;
        return {
            id: String(issue.id || ""),
            identifier: String(issue.identifier || ""),
            title: String(issue.title || ""),
            description: issue.description ?? undefined,
            url: String(issue.url || ""),
            branchName: issue.branchName ?? undefined,
            team: team
                ? {
                    id: String(team.id || ""),
                    name: team.name ?? undefined,
                    key: team.key ?? undefined,
                }
                : undefined,
            project: project
                ? {
                    id: String(project.id || ""),
                    name: project.name ?? undefined,
                    key: project.key ?? undefined,
                }
                : undefined,
            labels: labels?.map((l) => ({
                id: String(l.id || ""),
                name: String(l.name || ""),
            })),
        };
    }
    /**
     * Create an empty issue ref for cases where issue data is missing.
     */
    emptyIssueRef() {
        return {
            id: "",
            identifier: "",
            title: "",
            url: "",
        };
    }
    /**
     * Build comment reference from webhook comment data.
     */
    buildCommentRef(comment) {
        const user = comment.user;
        return {
            id: String(comment.id || ""),
            body: comment.body ?? undefined,
            user: user
                ? {
                    id: String(user.id || ""),
                    name: user.name ?? undefined,
                    displayName: user.displayName ?? undefined,
                    email: user.email ?? undefined,
                }
                : undefined,
        };
    }
    /**
     * Build agent activity reference from webhook data.
     */
    buildAgentActivityRef(activity) {
        const activityRaw = activity;
        const content = activityRaw?.content;
        return {
            id: activityRaw?.id ?? "",
            type: activityRaw?.type ?? undefined,
            signal: activityRaw?.signal ?? undefined,
            content: content
                ? {
                    type: content.type ?? undefined,
                    body: content.body ?? undefined,
                }
                : undefined,
        };
    }
    /**
     * Build guidance item from webhook guidance rule.
     */
    buildGuidanceItem(rule) {
        return {
            id: String(rule.id || randomUUID()),
            prompt: String(rule.body || ""),
        };
    }
    /**
     * Extract author from agent session (for session start).
     */
    extractAuthorFromSession(session) {
        const commentRaw = session.comment;
        const user = commentRaw?.user;
        if (!user)
            return undefined;
        return {
            id: String(user.id || ""),
            name: String(user.displayName || user.name || "Unknown"),
            email: user.email ?? undefined,
        };
    }
    /**
     * Extract author from agent activity (for prompts).
     */
    extractAuthorFromActivity(activity) {
        const activityRaw = activity;
        const content = activityRaw?.content;
        const user = content?.user;
        if (!user)
            return undefined;
        return {
            id: String(user.id || ""),
            name: String(user.displayName || user.name || "Unknown"),
            email: user.email ?? undefined,
        };
    }
}
//# sourceMappingURL=LinearMessageTranslator.js.map