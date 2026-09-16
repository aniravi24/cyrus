/**
 * Manages system prompts for Gemini CLI by writing them to disk
 * and configuring the GEMINI_SYSTEM_MD environment variable.
 *
 * Unlike Claude runner which can accept system prompts directly,
 * Gemini CLI requires system prompts to be in a file on disk.
 *
 * Supports parallel execution by using unique file paths per workspace.
 */
export declare class SystemPromptManager {
    private cyrusHome;
    private systemPromptPath;
    constructor(cyrusHome: string, workspaceName: string);
    /**
     * Write system prompt to disk and return the path to be used with GEMINI_SYSTEM_MD
     */
    prepareSystemPrompt(dynamicSystemPrompt: string): Promise<string>;
    /**
     * Get the path where system prompts are stored for this workspace
     */
    getSystemPromptPath(): string;
    /**
     * Resolve tilde (~) in paths to absolute home directory path
     */
    static resolveTildePath(path: string): string;
}
//# sourceMappingURL=systemPromptManager.d.ts.map