import { z } from "zod";
/**
 * Supported runner/harness types for agent execution.
 */
export declare const RunnerTypeSchema: z.ZodEnum<{
    claude: "claude";
    gemini: "gemini";
    codex: "codex";
    cursor: "cursor";
    opencode: "opencode";
}>;
export type RunnerType = z.infer<typeof RunnerTypeSchema>;
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
        silent: "silent";
        comment: "comment";
    }>>;
    blockMessage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export declare const JsonValueSchema: z.ZodType<JsonValue>;
export type JsonObject = {
    [key: string]: JsonValue;
};
export declare const JsonObjectSchema: z.ZodType<JsonObject>;
export declare const OpenCodeStateScopeSchema: z.ZodEnum<{
    inherit: "inherit";
    shared: "shared";
    repository: "repository";
}>;
export type OpenCodeStateScope = z.infer<typeof OpenCodeStateScopeSchema>;
export declare const OpenCodeConfigSchema: z.ZodObject<{
    stateScope: z.ZodOptional<z.ZodEnum<{
        inherit: "inherit";
        shared: "shared";
        repository: "repository";
    }>>;
    config: z.ZodOptional<z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>>;
}, z.core.$strip>;
/**
 * Network policy for egress sandboxing.
 * Controls which domains/subnets Bash-spawned subprocesses (git, gh, npm,
 * curl, etc.) can reach and enables per-domain header injection
 * (credentials brokering).
 *
 * Three modes (following Vercel Sandbox Firewall conventions):
 * - **allow-all**: No networkPolicy set — unrestricted access (default)
 * - **deny-all**: networkPolicy set with no `allow` rules — blocks all traffic
 * - **user-defined**: networkPolicy with `allow` rules — deny-all by default,
 *   only explicitly listed domains are reachable
 *
 * Scope: Claude Code's sandbox network proxy only intercepts traffic from
 * Bash tool subprocesses. It does NOT apply to Claude's own inference API
 * calls, MCP server traffic, or built-in file tools (Read/Edit/Write).
 *
 * @see https://docs.anthropic.com/en/docs/claude-code/security#sandbox
 * @see https://vercel.com/docs/vercel-sandbox/concepts/firewall#network-policies
 */
export declare const NetworkPolicySchema: z.ZodObject<{
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
}, z.core.$strip>;
/**
 * Sandbox configuration for network egress control.
 * Configures the egress proxy that intercepts outbound traffic from
 * Bash-spawned subprocesses in agent sessions.
 *
 * When enabled, the proxy starts on EdgeWorker boot and sandbox
 * network ports are passed to the Claude Agent SDK per-session.
 * Only Bash tool commands (git, gh, npm, curl, etc.) route through
 * the proxy — Claude's inference API, MCP servers, and built-in
 * file tools are unaffected.
 *
 * @see https://docs.anthropic.com/en/docs/claude-code/security#sandbox
 */
export declare const SandboxConfigSchema: z.ZodObject<{
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
}, z.core.$strip>;
/**
 * Configuration for a Linear workspace's credentials.
 * Keyed by workspace ID in EdgeConfig.linearWorkspaces.
 */
export declare const LinearWorkspaceConfigSchema: z.ZodObject<{
    linearToken: z.ZodString;
    linearRefreshToken: z.ZodOptional<z.ZodString>;
    linearWorkspaceSlug: z.ZodOptional<z.ZodString>;
    linearWorkspaceName: z.ZodOptional<z.ZodString>;
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
    gitlabUrl: z.ZodOptional<z.ZodString>;
    linearWorkspaceId: z.ZodOptional<z.ZodString>;
    teamKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
    routingLabels: z.ZodOptional<z.ZodArray<z.ZodString>>;
    projectKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
    linearToken: z.ZodOptional<z.ZodString>;
    linearRefreshToken: z.ZodOptional<z.ZodString>;
    linearWorkspaceName: z.ZodOptional<z.ZodString>;
    workspaceBaseDir: z.ZodString;
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
        config: z.ZodOptional<z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>>;
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
        gitlabUrl: z.ZodOptional<z.ZodString>;
        linearWorkspaceId: z.ZodOptional<z.ZodString>;
        teamKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routingLabels: z.ZodOptional<z.ZodArray<z.ZodString>>;
        projectKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        linearToken: z.ZodOptional<z.ZodString>;
        linearRefreshToken: z.ZodOptional<z.ZodString>;
        linearWorkspaceName: z.ZodOptional<z.ZodString>;
        workspaceBaseDir: z.ZodString;
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
            config: z.ZodOptional<z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
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
        config: z.ZodOptional<z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>>;
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
        config: z.ZodOptional<z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>>;
    }, z.core.$strip>>;
    workspaceBaseDir: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Payload version of EdgeConfigSchema for incoming API requests.
 * Uses RepositoryConfigPayloadSchema which has optional workspaceBaseDir.
 */
export declare const EdgeConfigPayloadSchema: z.ZodObject<{
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
        config: z.ZodOptional<z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>>;
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
            config: z.ZodOptional<z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>>;
        }, z.core.$strip>>;
        workspaceBaseDir: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Migrate an EdgeConfig from the legacy per-repo token format to the
 * workspace-keyed format.
 *
 * Old format: each repository has linearToken and linearRefreshToken.
 * New format: linearWorkspaces at EdgeConfig level keyed by workspace ID,
 * repositories no longer carry tokens.
 *
 * This function is idempotent — if linearWorkspaces already exists, it
 * returns the config unchanged.
 */
export declare function migrateEdgeConfig(input: Record<string, unknown>): Record<string, unknown>;
export type UserIdentifier = z.infer<typeof UserIdentifierSchema>;
export type UserAccessControlConfig = z.infer<typeof UserAccessControlConfigSchema>;
export type LinearWorkspaceConfig = z.infer<typeof LinearWorkspaceConfigSchema>;
export type OpenCodeConfigOverrides = z.infer<typeof OpenCodeConfigSchema>;
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;
export type NetworkPolicy = z.infer<typeof NetworkPolicySchema>;
export type RepositoryConfigPayload = z.infer<typeof RepositoryConfigPayloadSchema>;
export type EdgeConfigPayload = z.infer<typeof EdgeConfigPayloadSchema>;
/**
 * Assert that a repository has a Linear workspace ID and return it.
 * Use this in code paths that are only reached for Linear-linked repositories
 * (e.g. webhook handlers routed via workspace ID).
 */
export declare function requireLinearWorkspaceId(repo: RepositoryConfig): string;
//# sourceMappingURL=config-schemas.d.ts.map