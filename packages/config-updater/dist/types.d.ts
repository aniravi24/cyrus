import { z } from "zod";
/**
 * Repository configuration payload
 * Matches the format sent by cyrus-hosted
 */
export interface RepositoryPayload {
    repository_url: string;
    repository_name: string;
    githubUrl?: string;
}
/**
 * Repository deletion payload
 * Sent by cyrus-hosted when removing a repository
 */
export interface DeleteRepositoryPayload {
    repository_name: string;
    linear_team_key: string;
}
/**
 * Cyrus config update payload schema
 * Extends EdgeConfigPayloadSchema with operation flags for the update process.
 * Uses EdgeConfigPayloadSchema (not EdgeConfigSchema) because incoming payloads
 * may omit workspaceBaseDir - the handler applies a default value.
 */
export declare const CyrusConfigPayloadSchema: z.ZodObject<{
    ngrokAuthToken: z.ZodOptional<z.ZodString>;
    stripeCustomerId: z.ZodOptional<z.ZodString>;
    linearWorkspaceSlug: z.ZodOptional<z.ZodString>;
    defaultModel: z.ZodOptional<z.ZodString>;
    defaultFallbackModel: z.ZodOptional<z.ZodString>;
    global_setup_script: z.ZodOptional<z.ZodString>;
    defaultAllowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    defaultDisallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    issueUpdateTrigger: z.ZodOptional<z.ZodBoolean>;
    userAccessControl: z.ZodOptional<z.ZodObject<{
        allowedUsers: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            email: z.ZodString;
        }, z.core.$strip>]>>>;
        blockedUsers: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            email: z.ZodString;
        }, z.core.$strip>]>>>;
        blockBehavior: z.ZodOptional<z.ZodEnum<{
            comment: "comment";
            silent: "silent";
        }>>;
        blockMessage: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    promptDefaults: z.ZodOptional<z.ZodObject<{
        debugger: z.ZodOptional<z.ZodObject<{
            allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
            disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        builder: z.ZodOptional<z.ZodObject<{
            allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
            disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        scoper: z.ZodOptional<z.ZodObject<{
            allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
            disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        orchestrator: z.ZodOptional<z.ZodObject<{
            allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
            disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        "graphite-orchestrator": z.ZodOptional<z.ZodObject<{
            allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
            disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    repositories: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        repositoryPath: z.ZodString;
        baseBranch: z.ZodString;
        githubUrl: z.ZodOptional<z.ZodString>;
        linearWorkspaceId: z.ZodString;
        linearWorkspaceName: z.ZodOptional<z.ZodString>;
        linearToken: z.ZodString;
        linearRefreshToken: z.ZodOptional<z.ZodString>;
        teamKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routingLabels: z.ZodOptional<z.ZodArray<z.ZodString>>;
        projectKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        promptTemplatePath: z.ZodOptional<z.ZodString>;
        allowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        mcpConfigPath: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        appendInstruction: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        fallbackModel: z.ZodOptional<z.ZodString>;
        openaiApiKey: z.ZodOptional<z.ZodString>;
        openaiOutputDirectory: z.ZodOptional<z.ZodString>;
        labelPrompts: z.ZodOptional<z.ZodObject<{
            debugger: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodObject<{
                labels: z.ZodArray<z.ZodString>;
                allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
                disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>]>>;
            builder: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodObject<{
                labels: z.ZodArray<z.ZodString>;
                allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
                disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>]>>;
            scoper: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodObject<{
                labels: z.ZodArray<z.ZodString>;
                allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
                disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>]>>;
            orchestrator: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodObject<{
                labels: z.ZodArray<z.ZodString>;
                allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
                disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>]>>;
            "graphite-orchestrator": z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodObject<{
                labels: z.ZodArray<z.ZodString>;
                allowedTools: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<"readOnly">, z.ZodLiteral<"safe">, z.ZodLiteral<"all">, z.ZodLiteral<"coordinator">]>>;
                disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>]>>;
            graphite: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodObject<{
                labels: z.ZodArray<z.ZodString>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        userAccessControl: z.ZodOptional<z.ZodObject<{
            allowedUsers: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                email: z.ZodString;
            }, z.core.$strip>]>>>;
            blockedUsers: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                email: z.ZodString;
            }, z.core.$strip>]>>>;
            blockBehavior: z.ZodOptional<z.ZodEnum<{
                comment: "comment";
                silent: "silent";
            }>>;
            blockMessage: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        workspaceBaseDir: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    restartCyrus: z.ZodOptional<z.ZodBoolean>;
    backupConfig: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type CyrusConfigPayload = z.infer<typeof CyrusConfigPayloadSchema>;
/**
 * Cyrus environment variables payload (for Claude token)
 */
export interface CyrusEnvPayload {
    variables?: Record<string, string>;
    ANTHROPIC_API_KEY?: string;
    restartCyrus?: boolean;
    backupEnv?: boolean;
    [key: string]: string | boolean | Record<string, string> | undefined;
}
/**
 * MCP server configuration
 */
export interface McpServerConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    transport?: "stdio" | "sse";
    headers?: Record<string, string>;
}
/**
 * Test MCP connection payload
 */
export interface TestMcpPayload {
    transportType: "stdio" | "sse";
    serverUrl?: string | null;
    command?: string | null;
    commandArgs?: Array<{
        value: string;
        order: number;
    }> | null;
    headers?: Array<{
        name: string;
        value: string;
    }> | null;
    envVars?: Array<{
        key: string;
        value: string;
    }> | null;
}
/**
 * Configure MCP servers payload
 */
export interface ConfigureMcpPayload {
    mcpServers: Record<string, McpServerConfig>;
}
/**
 * Check GitHub CLI payload (empty - no parameters needed)
 */
export type CheckGhPayload = Record<string, never>;
/**
 * Check GitHub CLI response data
 */
export interface CheckGhData {
    isInstalled: boolean;
    isAuthenticated: boolean;
}
/**
 * Error response to send back to cyrus-hosted
 */
export interface ErrorResponse {
    success: false;
    error: string;
    details?: string;
}
/**
 * Success response to send back to cyrus-hosted
 */
export interface SuccessResponse {
    success: true;
    message: string;
    data?: any;
}
export type ApiResponse = SuccessResponse | ErrorResponse;
//# sourceMappingURL=types.d.ts.map