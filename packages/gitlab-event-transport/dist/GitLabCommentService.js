/**
 * Service for posting comments (notes) back to GitLab MR conversations.
 *
 * Uses the GitLab REST API v4 with a personal or project access token
 * to post notes on merge requests and reply to discussion threads.
 */
export class GitLabCommentService {
    apiBaseUrl;
    constructor(config) {
        this.apiBaseUrl = config?.apiBaseUrl ?? "https://gitlab.com";
    }
    /**
     * Post a note (comment) on a merge request.
     *
     * @see https://docs.gitlab.com/ee/api/notes.html#create-new-merge-request-note
     */
    async postMRNote(params) {
        const { token, projectId, mrIid, body } = params;
        const url = `${this.apiBaseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "PRIVATE-TOKEN": token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ body }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[GitLabCommentService] Failed to post MR note: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return (await response.json());
    }
    /**
     * Post a reply to a discussion thread on a merge request.
     *
     * @see https://docs.gitlab.com/ee/api/discussions.html#add-note-to-existing-merge-request-thread
     */
    async postDiscussionReply(params) {
        const { token, projectId, mrIid, discussionId, body } = params;
        const url = `${this.apiBaseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions/${discussionId}/notes`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "PRIVATE-TOKEN": token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ body }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[GitLabCommentService] Failed to post discussion reply: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return (await response.json());
    }
    /**
     * Add an award emoji (reaction) to a note on a merge request.
     *
     * @see https://docs.gitlab.com/ee/api/award_emoji.html#award-a-new-emoji-on-a-note
     */
    async addAwardEmoji(params) {
        const { token, projectId, mrIid, noteId, name } = params;
        const url = `${this.apiBaseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes/${noteId}/award_emoji`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "PRIVATE-TOKEN": token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[GitLabCommentService] Failed to add award emoji: ${response.status} ${response.statusText} - ${errorBody}`);
        }
    }
}
//# sourceMappingURL=GitLabCommentService.js.map