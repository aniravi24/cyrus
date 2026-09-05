/**
 * Service for posting comments (notes) back to GitLab MR conversations.
 *
 * Uses the GitLab REST API v4 with a personal or project access token
 * to post notes on merge requests and reply to discussion threads.
 */
export interface GitLabCommentServiceConfig {
    /** GitLab API base URL (default: https://gitlab.com) */
    apiBaseUrl?: string;
}
/**
 * Parameters for posting a note on a GitLab MR
 */
export interface PostMRNoteParams {
    /** GitLab access token */
    token: string;
    /** Project ID (numeric) */
    projectId: number;
    /** MR iid (project-scoped ID) */
    mrIid: number;
    /** Note body (markdown) */
    body: string;
}
/**
 * Parameters for posting a reply to a discussion thread
 */
export interface PostDiscussionReplyParams {
    /** GitLab access token */
    token: string;
    /** Project ID (numeric) */
    projectId: number;
    /** MR iid (project-scoped ID) */
    mrIid: number;
    /** Discussion ID to reply to */
    discussionId: string;
    /** Reply body (markdown) */
    body: string;
}
/**
 * Parameters for adding an award emoji (reaction) to a note
 */
export interface AddAwardEmojiParams {
    /** GitLab access token */
    token: string;
    /** Project ID (numeric) */
    projectId: number;
    /** MR iid (project-scoped ID) */
    mrIid: number;
    /** Note ID to react to */
    noteId: number;
    /** Emoji name (e.g., "eyes", "thumbsup", "heart") */
    name: string;
}
/**
 * Response from GitLab API after creating a note
 */
export interface GitLabNoteResponse {
    id: number;
    body: string;
    created_at: string;
    author: {
        id: number;
        username: string;
        name: string;
    };
}
export declare class GitLabCommentService {
    private apiBaseUrl;
    constructor(config?: GitLabCommentServiceConfig);
    /**
     * Post a note (comment) on a merge request.
     *
     * @see https://docs.gitlab.com/ee/api/notes.html#create-new-merge-request-note
     */
    postMRNote(params: PostMRNoteParams): Promise<GitLabNoteResponse>;
    /**
     * Post a reply to a discussion thread on a merge request.
     *
     * @see https://docs.gitlab.com/ee/api/discussions.html#add-note-to-existing-merge-request-thread
     */
    postDiscussionReply(params: PostDiscussionReplyParams): Promise<GitLabNoteResponse>;
    /**
     * Add an award emoji (reaction) to a note on a merge request.
     *
     * @see https://docs.gitlab.com/ee/api/award_emoji.html#award-a-new-emoji-on-a-note
     */
    addAwardEmoji(params: AddAwardEmojiParams): Promise<void>;
}
//# sourceMappingURL=GitLabCommentService.d.ts.map