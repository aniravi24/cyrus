/**
 * Options for creating Sora tools
 */
export interface SoraToolsOptions {
    /**
     * OpenAI API key
     */
    apiKey: string;
    /**
     * Directory to save generated videos (default: current working directory)
     */
    outputDirectory?: string;
}
/**
 * Create an SDK MCP server with Sora video generation tools
 */
export declare function createSoraToolsServer(options: SoraToolsOptions): import("@anthropic-ai/claude-agent-sdk").McpSdkServerConfigWithInstance;
//# sourceMappingURL=index.d.ts.map