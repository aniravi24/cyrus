import { z } from "zod";
/**
 * User identifier for access control matching.
 * Supports multiple formats for flexibility:
 * - String: treated as user ID (e.g., "usr_abc123")
 * - Object with id: explicit user ID match
 * - Object with email: email-based match
 */
export declare const UserIdentifierSchema: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>]>;
/**
 * User access control configuration for whitelisting/blacklisting users.
 */
export declare const UserAccessControlConfigSchema: z.ZodObject<{
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
}, z.core.$strip>;
/**
 * Configuration for a single repository/workspace pair
 */
export declare const RepositoryConfigSchema: z.ZodObject<{
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
    workspaceBaseDir: z.ZodString;
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
}, z.core.$strip>;
/**
 * Edge configuration - the serializable configuration stored in ~/.cyrus/config.json
 *
 * This schema defines all settings that can be persisted to disk.
 * It contains global settings that apply across all repositories,
 * plus the array of repository-specific configurations.
 */
export declare const EdgeConfigSchema: z.ZodObject<{
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
        workspaceBaseDir: z.ZodString;
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
    }, z.core.$strip>>;
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
}, z.core.$strip>;
/**
 * Payload version of RepositoryConfigSchema for incoming API requests.
 * Makes workspaceBaseDir optional since the handler applies a default.
 */
export declare const RepositoryConfigPayloadSchema: z.ZodObject<{
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
}, z.core.$strip>;
/**
 * Payload version of EdgeConfigSchema for incoming API requests.
 * Uses RepositoryConfigPayloadSchema which has optional workspaceBaseDir.
 */
export declare const EdgeConfigPayloadSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type UserIdentifier = z.infer<typeof UserIdentifierSchema>;
export type UserAccessControlConfig = z.infer<typeof UserAccessControlConfigSchema>;
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;
export type RepositoryConfigPayload = z.infer<typeof RepositoryConfigPayloadSchema>;
export type EdgeConfigPayload = z.infer<typeof EdgeConfigPayloadSchema>;
//# sourceMappingURL=config-schemas.d.ts.map