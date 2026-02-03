import type { SDKMessage } from "cyrus-claude-runner";
import type { CyrusAgentSession, Issue, Workspace } from "cyrus-core";
/**
 * Events emitted by EdgeWorker
 */
export interface EdgeWorkerEvents {
    connected: (token: string) => void;
    disconnected: (token: string, reason?: string) => void;
    "session:started": (issueId: string, issue: Issue, repositoryId: string) => void;
    "session:ended": (issueId: string, exitCode: number | null, repositoryId: string) => void;
    "claude:message": (issueId: string, message: SDKMessage, repositoryId: string) => void;
    "claude:response": (issueId: string, text: string, repositoryId: string) => void;
    "claude:tool-use": (issueId: string, tool: string, input: any, repositoryId: string) => void;
    error: (error: Error, context?: any) => void;
}
/**
 * Data returned from createAgentSession
 */
export interface AgentSessionData {
    session: CyrusAgentSession;
    fullIssue: Issue;
    workspace: Workspace;
    attachmentResult: {
        manifest: string;
        attachmentsDir: string | null;
    };
    attachmentsDir: string;
    allowedDirectories: string[];
    allowedTools: string[];
    disallowedTools: string[];
}
//# sourceMappingURL=types.d.ts.map