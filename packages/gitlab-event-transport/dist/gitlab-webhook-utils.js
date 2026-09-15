/**
 * Utility functions for processing GitLab webhook payloads
 */
/**
 * Type guard for note payloads
 */
export function isNotePayload(payload) {
    return payload.object_kind === "note";
}
/**
 * Type guard for merge_request payloads
 */
export function isMergeRequestPayload(payload) {
    return payload.object_kind === "merge_request";
}
/**
 * Check if a note webhook is for a merge request (not an issue or snippet)
 */
export function isNoteOnMergeRequest(event) {
    if (isNotePayload(event.payload)) {
        return (event.payload.object_attributes.noteable_type === "MergeRequest" &&
            event.payload.merge_request != null);
    }
    return false;
}
/**
 * Extract the MR source branch from a GitLab webhook event
 */
export function extractMRBranchRef(event) {
    if (isNotePayload(event.payload) && event.payload.merge_request) {
        return event.payload.merge_request.source_branch;
    }
    if (isMergeRequestPayload(event.payload)) {
        return event.payload.object_attributes.source_branch;
    }
    return null;
}
/**
 * Extract the MR target (base) branch from a GitLab webhook event
 */
export function extractMRBaseBranchRef(event) {
    if (isNotePayload(event.payload) && event.payload.merge_request) {
        return event.payload.merge_request.target_branch;
    }
    if (isMergeRequestPayload(event.payload)) {
        return event.payload.object_attributes.target_branch;
    }
    return null;
}
/**
 * Extract the MR iid (project-scoped ID) from a GitLab webhook event
 */
export function extractMRIid(event) {
    if (isNotePayload(event.payload) && event.payload.merge_request) {
        return event.payload.merge_request.iid;
    }
    if (isMergeRequestPayload(event.payload)) {
        return event.payload.object_attributes.iid;
    }
    return null;
}
/**
 * Extract the note body from a GitLab note webhook event
 */
export function extractNoteBody(event) {
    if (isNotePayload(event.payload)) {
        return event.payload.object_attributes.note;
    }
    return "";
}
/**
 * Extract the note/event author username from a GitLab webhook event
 */
export function extractNoteAuthor(event) {
    return event.payload.user.username;
}
/**
 * Extract the note ID from a GitLab webhook event
 */
export function extractNoteId(event) {
    if (isNotePayload(event.payload)) {
        return event.payload.object_attributes.id;
    }
    return null;
}
/**
 * Extract the discussion ID from a GitLab note webhook event
 */
export function extractDiscussionId(event) {
    if (isNotePayload(event.payload)) {
        return event.payload.object_attributes.discussion_id ?? null;
    }
    return null;
}
/**
 * Extract project path_with_namespace (e.g., "group/project") from a GitLab webhook event
 */
export function extractProjectPath(event) {
    return event.payload.project.path_with_namespace;
}
/**
 * Extract project ID from a GitLab webhook event
 */
export function extractProjectId(event) {
    return event.payload.project.id;
}
/**
 * Extract the MR title from a GitLab webhook event
 */
export function extractMRTitle(event) {
    if (isNotePayload(event.payload) && event.payload.merge_request) {
        return event.payload.merge_request.title;
    }
    if (isMergeRequestPayload(event.payload)) {
        return event.payload.object_attributes.title;
    }
    return null;
}
/**
 * Extract the MR web URL from a GitLab webhook event
 */
export function extractMRUrl(event) {
    if (isNotePayload(event.payload) && event.payload.merge_request) {
        return event.payload.merge_request.url;
    }
    if (isMergeRequestPayload(event.payload)) {
        return event.payload.object_attributes.url;
    }
    return null;
}
/**
 * Extract the note URL from a GitLab note webhook event
 */
export function extractNoteUrl(event) {
    if (isNotePayload(event.payload)) {
        return event.payload.object_attributes.url;
    }
    return "";
}
/**
 * Extract a unique session identifier for the GitLab webhook event.
 * Uses gitlab:path_with_namespace!iid format.
 */
export function extractSessionKey(event) {
    const projectPath = extractProjectPath(event);
    const mrIid = extractMRIid(event);
    return `gitlab:${projectPath}!${mrIid}`;
}
/**
 * Strip the @mention from a note body to get the actual instructions
 */
export function stripMention(noteBody, mentionHandle = "@cyrusagent") {
    return noteBody
        .replace(new RegExp(`\\s*${mentionHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "gi"), " ")
        .trim();
}
//# sourceMappingURL=gitlab-webhook-utils.js.map