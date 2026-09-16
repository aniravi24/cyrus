import type { McpServerConfig } from "cyrus-core";
import type { CodexConfigOverrides } from "../types.js";
/** Inputs the MCP translator needs from a runner config. */
export interface McpTranslationInput {
    workingDirectory?: string;
    mcpConfigPath?: string | string[];
    mcpConfig?: Record<string, McpServerConfig>;
    allowedTools?: string[];
}
/**
 * Translate Cyrus MCP server configs (file-based + inline) and Cyrus
 * `allowedTools` semantics into Codex-native `mcp_servers` config overrides.
 *
 * Reference: {@link https://platform.openai.com/docs/docs-mcp}
 */
export declare function buildCodexMcpServersConfig(input: McpTranslationInput): Record<string, CodexConfigOverrides> | undefined;
//# sourceMappingURL=mcpConfigTranslator.d.ts.map