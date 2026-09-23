import type { IIssueTrackerService, ILogger, Issue, LinearWorkspaceConfig } from "cyrus-core";
export declare class AttachmentService {
    private logger;
    private cyrusHome;
    private linearWorkspaces;
    constructor(logger: ILogger, cyrusHome: string, linearWorkspaces: Record<string, LinearWorkspaceConfig>);
    /**
     * Update the stored Linear workspace configs (e.g. after token refresh).
     */
    setLinearWorkspaces(linearWorkspaces: Record<string, LinearWorkspaceConfig>): void;
    /**
     * Get the Linear API token for a workspace
     */
    private getLinearTokenForWorkspace;
    extractAttachmentUrls(text: string): string[];
    /**
     * Download attachments from Linear issue
     * @param issue Linear issue object from webhook data
     * @param linearWorkspaceId Linear workspace ID for token lookup
     * @param workspacePath Path to workspace directory
     * @param issueTracker Optional issue tracker service for fetching comments and native attachments
     */
    downloadIssueAttachments(issue: Issue, linearWorkspaceId: string, workspacePath: string, issueTracker?: IIssueTrackerService): Promise<{
        manifest: string;
        attachmentsDir: string | null;
    }>;
    /**
     * Download a single attachment from Linear
     */
    downloadAttachment(attachmentUrl: string, destinationPath: string, linearToken: string): Promise<{
        success: boolean;
        fileType?: string;
        isImage?: boolean;
    }>;
    /**
     * Download attachments from a specific comment
     * @param commentBody The body text of the comment
     * @param attachmentsDir Directory where attachments should be saved
     * @param linearToken Linear API token
     * @param existingAttachmentCount Current number of attachments already downloaded
     */
    downloadCommentAttachments(commentBody: string, attachmentsDir: string, linearToken: string | null, existingAttachmentCount: number): Promise<{
        newAttachmentMap: Record<string, string>;
        newImageMap: Record<string, string>;
        totalNewAttachments: number;
        failedCount: number;
    }>;
    /**
     * Count existing images in the attachments directory
     */
    countExistingImages(attachmentsDir: string): Promise<number>;
    /**
     * Generate attachment manifest for new comment attachments
     */
    generateNewAttachmentManifest(result: {
        newAttachmentMap: Record<string, string>;
        newImageMap: Record<string, string>;
        totalNewAttachments: number;
        failedCount: number;
    }): string;
    /**
     * Generate a markdown section describing downloaded attachments
     */
    generateAttachmentManifest(downloadResult: {
        attachmentMap: Record<string, string>;
        imageMap: Record<string, string>;
        totalFound: number;
        downloaded: number;
        imagesDownloaded: number;
        skipped: number;
        failed: number;
        nativeAttachments?: Array<{
            title: string;
            url: string;
        }>;
    }): string;
}
//# sourceMappingURL=AttachmentService.d.ts.map