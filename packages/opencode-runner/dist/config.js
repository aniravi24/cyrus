import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
const ENV_DENY_PATTERNS = ["*.env", "*.env.*"];
// Cyrus shares platform tool defaults across runners. These Claude SDK tools
// have no OpenCode equivalent, so omitting them is expected rather than a
// configuration error worth logging for every session.
const CLAUDE_ONLY_TOOL_NAMES = new Set([
    "enterworktree",
    "exitworktree",
    "sendmessage",
    "pushnotification",
    "croncreate",
    "crondelete",
    "cronlist",
    "schedulewakeup",
    "monitor",
    "remotetrigger",
    "toolsearch",
    "designsync",
    "workflow",
    "reportfindings",
    "listagents",
    "lsp",
]);
function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function parseToolPattern(pattern) {
    const trimmed = pattern.trim();
    if (!trimmed)
        return null;
    const mcpPattern = parseMcpPattern(trimmed);
    if (mcpPattern) {
        return { name: "mcp", argument: trimmed, original: trimmed };
    }
    const match = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)(?:\((.*)\))?$/);
    if (!match)
        return null;
    return {
        name: match[1] || "",
        argument: match[2]?.trim() ?? null,
        original: trimmed,
    };
}
function parseMcpPattern(pattern) {
    if (!pattern.toLowerCase().startsWith("mcp__"))
        return null;
    const parts = pattern.split("__");
    if (parts.length < 2)
        return null;
    const server = parts[1]?.trim();
    if (!server)
        return null;
    const tool = parts.length >= 3 ? parts.slice(2).join("__").trim() : null;
    return { server, tool: tool || null };
}
function normalizeMcpToolName(server, tool) {
    return `${server}_${tool || "*"}`;
}
function normalizeBashRule(argument) {
    const rules = argument
        .split(",")
        .map((rule) => rule.trim())
        .filter(Boolean);
    return rules.flatMap((rule) => {
        if (rule === "*" || rule === "**")
            return ["*"];
        const colonIdx = rule.indexOf(":");
        if (colonIdx < 0)
            return [rule];
        const command = rule.slice(0, colonIdx).trim();
        const args = rule.slice(colonIdx + 1).trim();
        if (!command)
            return [];
        return [args ? `${command} ${args}` : command];
    });
}
function addPermissionRule(permission, tool, target, action) {
    if (!target) {
        permission[tool] = action;
        return;
    }
    const existing = permission[tool];
    let rules;
    if (isRecord(existing)) {
        rules = existing;
    }
    else {
        rules = { "*": "deny" };
        permission[tool] = rules;
    }
    rules[target] = action;
}
function addFileToolRule(permission, tool, argument, action) {
    const target = argument || "*";
    addPermissionRule(permission, tool, target, action);
}
function addOpenCodePermission(permission, pattern, action, unsupported) {
    const mcp = parseMcpPattern(pattern.trim());
    if (mcp) {
        addPermissionRule(permission, normalizeMcpToolName(mcp.server, mcp.tool), null, action);
        return;
    }
    const parsed = parseToolPattern(pattern);
    if (!parsed) {
        unsupported.push(`permission:${pattern}: Unsupported Cyrus tool pattern for OpenCode`);
        return;
    }
    const name = parsed.name.toLowerCase();
    if (CLAUDE_ONLY_TOOL_NAMES.has(name)) {
        return;
    }
    switch (name) {
        case "read":
            addFileToolRule(permission, "read", parsed.argument, action);
            return;
        case "glob":
            addFileToolRule(permission, "glob", parsed.argument, action);
            return;
        case "grep":
            addFileToolRule(permission, "grep", parsed.argument, action);
            return;
        case "edit":
        case "write":
        case "multiedit":
        case "notebookedit":
            addFileToolRule(permission, "edit", parsed.argument, action);
            return;
        case "bash":
        case "shell": {
            if (!parsed.argument) {
                addPermissionRule(permission, "bash", "*", action);
                return;
            }
            const rules = normalizeBashRule(parsed.argument);
            if (rules.length === 0) {
                unsupported.push(`permission:${pattern}: Unsupported Cyrus tool pattern for OpenCode`);
                return;
            }
            for (const rule of rules)
                addPermissionRule(permission, "bash", rule, action);
            return;
        }
        case "webfetch":
            addPermissionRule(permission, "webfetch", null, action);
            return;
        case "websearch":
            addPermissionRule(permission, "websearch", null, action);
            return;
        case "task":
        case "taskcreate":
        case "taskupdate":
        case "taskget":
        case "tasklist":
        case "taskoutput":
        case "taskstop":
            addPermissionRule(permission, "task", null, action);
            return;
        case "skill":
            addFileToolRule(permission, "skill", parsed.argument, action);
            return;
        case "todowrite":
            addPermissionRule(permission, "todowrite", null, action);
            return;
        case "askuserquestion":
        case "question":
            addPermissionRule(permission, "question", null, action);
            return;
        default:
            unsupported.push(`permission:${pattern}: Unsupported Cyrus tool pattern for OpenCode`);
    }
}
function applySensitiveFileDenies(permission) {
    const existing = permission.read;
    if (!isRecord(existing))
        return;
    for (const pattern of ENV_DENY_PATTERNS) {
        existing[pattern] = "deny";
    }
    existing["*.env.example"] = "allow";
}
function addExternalDirectoryPermissions(permission, workingDirectory, allowedDirectories) {
    const workspace = resolve(workingDirectory);
    for (const directory of allowedDirectories ?? []) {
        const resolved = resolve(directory);
        if (resolved === workspace || resolved.startsWith(`${workspace}/`)) {
            continue;
        }
        addPermissionRule(permission, "external_directory", `${resolved}/**`, "allow");
    }
}
function addConfiguredMcpPermissions(permission, mcp) {
    for (const [name, server] of Object.entries(mcp ?? {})) {
        if (!isRecord(server) || server.enabled === false)
            continue;
        addPermissionRule(permission, normalizeMcpToolName(name, null), null, "allow");
    }
}
function mapMcpServer(name, server, unsupported) {
    if (!server || typeof server !== "object")
        return null;
    if (typeof server.url === "string" && server.url) {
        const transport = server.transport || server.type || "http";
        if (transport === "sse") {
            unsupported.push(`mcp:${name}: OpenCode runner supports stdio and streamable HTTP MCP servers, not sse`);
            return null;
        }
        return {
            type: "remote",
            url: server.url,
            ...(server.headers ? { headers: server.headers } : {}),
            ...(isRecord(server.oauth) ? { oauth: server.oauth } : {}),
            enabled: true,
        };
    }
    if (typeof server.command === "string" && server.command) {
        return {
            type: "local",
            command: [server.command, ...(server.args ?? [])],
            ...(server.env ? { environment: server.env } : {}),
            enabled: true,
        };
    }
    unsupported.push(`mcp:${name}: OpenCode runner requires either a command or streamable HTTP url`);
    return null;
}
function loadMcpConfigFromPaths(configPaths, unsupported) {
    if (!configPaths)
        return {};
    const paths = Array.isArray(configPaths) ? configPaths : [configPaths];
    let servers = {};
    for (const configPath of paths) {
        try {
            const parsed = JSON.parse(readFileSync(configPath, "utf8"));
            if (isRecord(parsed.mcpServers)) {
                servers = {
                    ...servers,
                    ...parsed.mcpServers,
                };
            }
        }
        catch (error) {
            unsupported.push(`mcpConfigPath:${configPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return servers;
}
function isPlainObject(value) {
    return isRecord(value);
}
function deepMergeConfig(base, override) {
    if (!override)
        return { ...base };
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
        const existing = merged[key];
        if (isPlainObject(existing) && isPlainObject(value)) {
            merged[key] = deepMergeConfig(existing, value);
        }
        else {
            merged[key] = value;
        }
    }
    return merged;
}
export function buildOpenCodeConfig(config) {
    const unsupported = [];
    if (config.maxTurns !== undefined) {
        unsupported.push("maxTurns: OpenCode CLI does not expose a max-turns runtime option");
    }
    if (config.fallbackModel) {
        unsupported.push("fallbackModel: OpenCode CLI does not expose a fallback-model runtime option");
    }
    const workingDirectory = config.workingDirectory || process.cwd();
    // OpenCode defaults to allowing tools unless permission rules say
    // otherwise. Cyrus sessions must be deny-by-default so hosted/sandboxed
    // runs do not inherit a permissive project or user config unexpectedly.
    const permission = {
        "*": "deny",
        // OpenCode treats repeated calls as an interactive permission request.
        // Cyrus is headless, so that request otherwise terminates the whole run.
        doom_loop: "allow",
    };
    for (const pattern of config.allowedTools ?? []) {
        addOpenCodePermission(permission, pattern, "allow", unsupported);
    }
    const mcpServers = {
        ...loadMcpConfigFromPaths(config.mcpConfigPath, unsupported),
        ...(config.mcpConfig ?? {}),
    };
    const mcp = {};
    for (const [name, server] of Object.entries(mcpServers)) {
        const mapped = mapMcpServer(name, server, unsupported);
        if (mapped)
            mcp[name] = mapped;
    }
    const userConfig = deepMergeConfig(deepMergeConfig({}, config.opencodeGlobalConfig), config.opencodeRepositoryConfig);
    const generatedConfig = {
        $schema: "https://opencode.ai/config.json",
        ...(Object.keys(mcp).length > 0 ? { mcp } : {}),
        permission,
    };
    const runtimeConfig = deepMergeConfig(userConfig, generatedConfig);
    if (isRecord(userConfig.mcp) || Object.keys(mcp).length > 0) {
        runtimeConfig.mcp = {
            ...(isRecord(userConfig.mcp) ? userConfig.mcp : {}),
            ...mcp,
        };
    }
    addConfiguredMcpPermissions(permission, runtimeConfig.mcp);
    for (const pattern of config.disallowedTools ?? []) {
        addOpenCodePermission(permission, pattern, "deny", unsupported);
    }
    applySensitiveFileDenies(permission);
    addExternalDirectoryPermissions(permission, workingDirectory, config.allowedDirectories);
    // Cyrus permissions are safety controls, so they replace user-provided
    // permission config instead of preserving non-conflicting entries.
    runtimeConfig.permission = permission;
    return { config: runtimeConfig, unsupported };
}
function sanitizePathSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}
export function buildOpenCodeStateRoot(config) {
    const scope = config.opencodeStateScope ?? "inherit";
    if (scope === "shared") {
        return join(config.cyrusHome, "opencode-state", "shared");
    }
    if (scope === "repository") {
        const key = config.opencodeStateKey ||
            config.workspaceName ||
            sanitizePathSegment(basename(resolve(config.workingDirectory || process.cwd())));
        return join(config.cyrusHome, "opencode-state", "repositories", sanitizePathSegment(key) || "repository");
    }
    const workingDirectory = resolve(config.workingDirectory || process.cwd());
    const workspaceName = config.workspaceName || sanitizePathSegment(basename(workingDirectory));
    const safeWorkspaceName = sanitizePathSegment(workspaceName) || "workspace";
    return join(config.cyrusHome, "opencode-state", safeWorkspaceName);
}
export function buildOpenCodeRuntimeEnv(config) {
    const built = buildOpenCodeConfig(config);
    // OpenCode loads OPENCODE_CONFIG_CONTENT after project config, making this
    // the safest supported place for Cyrus-enforced MCP and permission rules.
    const env = {
        OPENCODE_CONFIG_CONTENT: JSON.stringify(built.config),
    };
    if ((config.opencodeStateScope ?? "inherit") === "inherit") {
        return env;
    }
    const stateRoot = buildOpenCodeStateRoot(config);
    // Keep XDG_DATA_HOME unset so OpenCode can use its CLI-managed auth and
    // provider catalog from the user's data home.
    return {
        ...env,
        OPENCODE_CONFIG_DIR: join(stateRoot, "opencode-config"),
        XDG_STATE_HOME: join(stateRoot, "state"),
        XDG_CACHE_HOME: join(stateRoot, "cache"),
        XDG_CONFIG_HOME: join(stateRoot, "config"),
    };
}
export function hasOpenCodeRuntimeConfig(config) {
    return Boolean(config.permission ||
        (config.mcp && Object.keys(config.mcp).length > 0) ||
        config.$schema);
}
export function ensureOpenCodeStateDirectories(env) {
    for (const key of [
        "OPENCODE_CONFIG_DIR",
        "XDG_STATE_HOME",
        "XDG_CACHE_HOME",
        "XDG_CONFIG_HOME",
    ]) {
        const dir = env[key];
        if (!dir || existsSync(dir))
            continue;
        // OpenCode imports its global path module before running, so these XDG
        // roots must already exist when the child process starts.
        mkdirSync(dir, { recursive: true });
    }
}
//# sourceMappingURL=config.js.map