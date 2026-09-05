import { z } from "zod";
/**
 * Repository configuration payload
 * Matches the format sent by cyrus-hosted
 */
export interface RepositoryPayload {
    repository_url: string;
    repository_name: string;
    githubUrl?: string;
    gitlabUrl?: string;
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
    linearWorkspaces: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        linearToken: z.ZodString;
        linearRefreshToken: z.ZodOptional<z.ZodString>;
        linearWorkspaceSlug: z.ZodOptional<z.ZodString>;
        linearWorkspaceName: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    linearWorkspaceSlug: z.ZodOptional<z.ZodString>;
    ngrokAuthToken: z.ZodOptional<z.ZodString>;
    stripeCustomerId: z.ZodOptional<z.ZodString>;
    claudeDefaultModel: z.ZodOptional<z.ZodString>;
    claudeDefaultFallbackModel: z.ZodOptional<z.ZodString>;
    claudeDefaultEffort: z.ZodOptional<z.ZodString>;
    geminiDefaultModel: z.ZodOptional<z.ZodString>;
    codexDefaultModel: z.ZodOptional<z.ZodString>;
    cursorDefaultModel: z.ZodOptional<z.ZodString>;
    cursorDefaultFallbackModel: z.ZodOptional<z.ZodString>;
    opencodeDefaultModel: z.ZodOptional<z.ZodString>;
    opencodeDefaultFallbackModel: z.ZodOptional<z.ZodString>;
    inferOpenCodeRunnerFromProviderModel: z.ZodOptional<z.ZodBoolean>;
    opencode: z.ZodOptional<z.ZodObject<{
        stateScope: z.ZodOptional<z.ZodEnum<{
            inherit: "inherit";
            shared: "shared";
            repository: "repository";
        }>>;
        config: z.ZodOptional<z.ZodType<import("packages/core/dist/config-schemas.js").JsonObject, unknown, z.core.$ZodTypeInternals<import("packages/core/dist/config-schemas.js").JsonObject, unknown>>>;
    }, z.core.$strip>>;
    defaultRunner: z.ZodOptional<z.ZodEnum<{
        claude: "claude";
        gemini: "gemini";
        codex: "codex";
        cursor: "cursor";
        opencode: "opencode";
    }>>;
    defaultModel: z.ZodOptional<z.ZodString>;
    defaultFallbackModel: z.ZodOptional<z.ZodString>;
    global_setup_script: z.ZodOptional<z.ZodString>;
    linearAllowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    defaultAllowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    defaultDisallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    slackAllowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    githubAllowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    slackMcpConfigs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    linearMcpConfigs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    githubMcpConfigs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    strictMcpConfig: z.ZodOptional<z.ZodBoolean>;
    issueUpdateTrigger: z.ZodOptional<z.ZodBoolean>;
    slackThreadFollowing: z.ZodOptional<z.ZodBoolean>;
    prReviewTrigger: z.ZodOptional<z.ZodBoolean>;
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
            silent: "silent";
            comment: "comment";
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
    sandbox: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        httpProxyPort: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        socksProxyPort: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        networkPolicy: z.ZodOptional<z.ZodObject<{
            preset: z.ZodOptional<z.ZodEnum<{
                trusted: "trusted";
            }>>;
            allow: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                transform: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    headers: z.ZodRecord<z.ZodString, z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>>>;
            subnets: z.ZodOptional<z.ZodObject<{
                allow: z.ZodOptional<z.ZodArray<z.ZodString>>;
                deny: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        systemWideCert: z.ZodOptional<z.ZodBoolean>;
        logRequests: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    repositories: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        repositoryPath: z.ZodString;
        baseBranch: z.ZodString;
        githubUrl: z.ZodOptional<z.ZodString>;
        gitlabUrl: z.ZodOptional<z.ZodString>;
        linearWorkspaceId: z.ZodOptional<z.ZodString>;
        teamKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routingLabels: z.ZodOptional<z.ZodArray<z.ZodString>>;
        projectKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        linearToken: z.ZodOptional<z.ZodString>;
        linearRefreshToken: z.ZodOptional<z.ZodString>;
        linearWorkspaceName: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        promptTemplatePath: z.ZodOptional<z.ZodString>;
        allowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        mcpConfigPath: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        appendInstruction: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        fallbackModel: z.ZodOptional<z.ZodString>;
        effort: z.ZodOptional<z.ZodString>;
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
                silent: "silent";
                comment: "comment";
            }>>;
            blockMessage: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        opencode: z.ZodOptional<z.ZodObject<{
            stateScope: z.ZodOptional<z.ZodEnum<{
                inherit: "inherit";
                shared: "shared";
                repository: "repository";
            }>>;
            config: z.ZodOptional<z.ZodType<import("packages/core/dist/config-schemas.js").JsonObject, unknown, z.core.$ZodTypeInternals<import("packages/core/dist/config-schemas.js").JsonObject, unknown>>>;
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
    transportType: "stdio" | "sse" | "http";
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
 * Check GitLab CLI payload (empty - no parameters needed)
 */
export type CheckGlabPayload = Record<string, never>;
/**
 * Check GitLab CLI response data
 */
export interface CheckGlabData {
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
/**
 * Create or update a user skill
 * Sent by cyrus-hosted when a user creates/edits a skill
 */
export interface UpdateSkillPayload {
    /** Skill name — used as the directory name and invocation name */
    name: string;
    /** One-line description shown in the Skill tool's list */
    description: string;
    /** Full skill content (Markdown body, excluding the frontmatter — frontmatter is generated from name + description) */
    content: string;
    /**
     * Optional scope restrictions. When any dimension is non-empty, the skill is
     * only available in sessions whose context matches every populated dimension
     * (AND across dimensions, OR within each list). When all dimensions are
     * omitted/empty the skill is globally available.
     */
    repositoryIds?: string[];
    linearTeamIds?: string[];
    linearLabelIds?: string[];
}
/**
 * Delete a user skill
 * Sent by cyrus-hosted when a user removes a skill
 */
export interface DeleteSkillPayload {
    /** Skill name to delete */
    name: string;
}
/**
 * List user skills payload (empty — no parameters needed)
 */
export type ListSkillsPayload = Record<string, never>;
/**
 * Skill info returned in list responses
 */
export interface SkillInfo {
    name: string;
    description: string;
}
//# sourceMappingURL=types.d.ts.map