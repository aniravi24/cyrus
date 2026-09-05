import { BaseCommand } from "./ICommand.js";
/**
 * Self-auth-linear command - authenticate with Linear OAuth directly from CLI
 * Handles the complete OAuth flow without requiring EdgeWorker
 */
export declare class SelfAuthCommand extends BaseCommand {
    private server;
    private callbackPort;
    execute(_args: string[]): Promise<void>;
    private waitForCallback;
    private exchangeCodeForTokens;
    private fetchWorkspaceInfo;
    private cleanup;
}
//# sourceMappingURL=SelfAuthCommand.d.ts.map