/**
 * Available GPT Image models
 */
export type ImageModel = "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
/**
 * Options for creating image generation tools
 */
export interface ImageToolsOptions {
    /**
     * OpenAI API key
     */
    apiKey: string;
    /**
     * Directory to save generated images (default: current working directory)
     */
    outputDirectory?: string;
}
/**
 * Create an SDK MCP server with GPT Image generation tools
 * Uses the direct Images API for synchronous generation with model selection
 *
 * @see https://platform.openai.com/docs/guides/image-generation - GPT Image documentation
 * @see https://platform.openai.com/docs/api-reference/images - Images API reference
 */
export declare function createImageToolsServer(options: ImageToolsOptions): import("@anthropic-ai/claude-agent-sdk").McpSdkServerConfigWithInstance;
//# sourceMappingURL=index.d.ts.map