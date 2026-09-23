import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type OpenAI from "openai";
/**
 * Available GPT Image models
 */
export type ImageModel = "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
/**
 * Register GPT Image generation tools on the given MCP server.
 * Uses the direct Images API for synchronous generation with model selection.
 *
 * @see https://platform.openai.com/docs/guides/image-generation - GPT Image documentation
 * @see https://platform.openai.com/docs/api-reference/images - Images API reference
 */
export declare function registerImageTools(server: McpServer, client: OpenAI, outputDirectory: string): void;
//# sourceMappingURL=index.d.ts.map