import type { McpServerConfig } from "cyrus-core";
import type { GeminiMcpServerConfig } from "./types.js";
/**
 * Options for generating Gemini settings
 */
export interface GeminiSettingsOptions {
    maxSessionTurns?: number;
    mcpServers?: Record<string, GeminiMcpServerConfig>;
    allowMCPServers?: string[];
    excludeMCPServers?: string[];
}
/**
 * Convert McpServerConfig (cyrus-core format) to GeminiMcpServerConfig (Gemini CLI format)
 * Gemini MCP config reference:
 * - https://geminicli.com/docs/cli/tutorials/mcp-setup/#how-to-configure-gemini-cli
 * - https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md
 *
 * Gemini CLI supports three transport types:
 * - stdio: command-based (spawns subprocess)
 * - sse: Server-Sent Events (url-based)
 * - http: Streamable HTTP (httpUrl-based)
 *
 * Claude SDK's McpServerConfig uses `type: "http"` with `url` for HTTP servers.
 * This function maps to Gemini CLI's format which uses `httpUrl` for HTTP transport.
 *
 * @param serverName - Name of the MCP server (for logging)
 * @param config - McpServerConfig from cyrus-core
 * @returns GeminiMcpServerConfig or null if conversion not possible
 */
export declare function convertToGeminiMcpConfig(serverName: string, config: McpServerConfig): GeminiMcpServerConfig | null;
/**
 * Load MCP configuration from file paths
 *
 * @param configPaths - Single path or array of paths to MCP config files
 *
 * @returns Merged MCP server configurations
 */
export declare function loadMcpConfigFromPaths(configPaths: string | string[] | undefined): Record<string, McpServerConfig>;
/**
 * Auto-detect .mcp.json in working directory
 *
 * @param workingDirectory - Working directory to check
 * @returns Path to .mcp.json if valid, undefined otherwise
 */
export declare function autoDetectMcpConfig(workingDirectory?: string): string | undefined;
/**
 * Backup existing settings.json if it exists
 * Returns true if backup was created, false if no file to backup
 */
export declare function backupGeminiSettings(projectRoot?: string): boolean;
/**
 * Restore settings.json from backup
 * Returns true if restored, false if no backup exists
 */
export declare function restoreGeminiSettings(projectRoot?: string): boolean;
/**
 * Delete settings.json (used when no backup existed)
 */
export declare function deleteGeminiSettings(projectRoot?: string): void;
/**
 * Write settings.json with specified options
 * Creates project-local .gemini directory if `projectRoot` is set.
 * Otherwise falls back to ~/.gemini.
 *
 * @param options - Settings options including maxSessionTurns, mcpServers, etc.
 */
export declare function writeGeminiSettings(options: GeminiSettingsOptions, projectRoot?: string): void;
/**
 * Setup Gemini settings for a session
 * Returns cleanup function to call when session ends
 *
 * @param options - Settings options including maxSessionTurns, mcpServers, etc.
 */
export declare function setupGeminiSettings(options: GeminiSettingsOptions, projectRoot?: string): () => void;
//# sourceMappingURL=settingsGenerator.d.ts.map