import type { OpenCodeRunnerConfig } from "./types.js";
export type OpenCodePermissionAction = "ask" | "allow" | "deny";
export type OpenCodePermissionRule = OpenCodePermissionAction | Record<string, OpenCodePermissionAction>;
export interface OpenCodeMcpLocalConfig {
    type: "local";
    command: string[];
    environment?: Record<string, string>;
    enabled?: boolean;
}
export interface OpenCodeMcpRemoteConfig {
    type: "remote";
    url: string;
    headers?: Record<string, string>;
    oauth?: Record<string, unknown>;
    enabled?: boolean;
}
export interface OpenCodeRuntimeConfig extends Record<string, unknown> {
    $schema?: string;
    mcp?: Record<string, OpenCodeMcpLocalConfig | OpenCodeMcpRemoteConfig>;
    permission?: Record<string, OpenCodePermissionRule>;
}
export interface OpenCodeConfigBuildResult {
    config: OpenCodeRuntimeConfig;
    unsupported: string[];
}
export declare function buildOpenCodeConfig(config: OpenCodeRunnerConfig): OpenCodeConfigBuildResult;
export declare function buildOpenCodeStateRoot(config: OpenCodeRunnerConfig): string;
export declare function buildOpenCodeRuntimeEnv(config: OpenCodeRunnerConfig): Record<string, string>;
export declare function hasOpenCodeRuntimeConfig(config: OpenCodeRuntimeConfig): boolean;
export declare function ensureOpenCodeStateDirectories(env: Record<string, string>): void;
//# sourceMappingURL=config.d.ts.map