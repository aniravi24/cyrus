const MAX_RESULT_LENGTH = 4000;
/** Primary argument per omp tool, used for the one-line activity label. */
const SUBJECT_KEYS = {
    ast_edit: ["paths"],
    ast_grep: ["pat"],
    bash: ["command"],
    edit: ["input"],
    eval: ["title", "code"],
    glob: ["path", "pattern"],
    grep: ["pattern"],
    hub: ["op"],
    lsp: ["action"],
    read: ["path"],
    task: ["i"],
    web_search: ["query"],
    write: ["path"],
};
function firstString(input, keys) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        return null;
    const record = { ...input };
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.length > 0)
            return value;
        if (Array.isArray(value) && value.length > 0)
            return value.join(", ");
    }
    return null;
}
/**
 * Formats omp tool activity for the issue-tracker timeline. omp tool inputs are
 * flat and already named for humans, so the subject is a named argument rather
 * than a per-tool rendering.
 */
export class OmpMessageFormatter {
    formatTodoWriteParameter(jsonContent) {
        return jsonContent;
    }
    formatTaskParameter(toolName, toolInput) {
        return this.formatToolParameter(toolName, toolInput);
    }
    formatToolParameter(toolName, toolInput) {
        const keys = SUBJECT_KEYS[toolName] ?? ["i", "path", "command", "query"];
        const subject = firstString(toolInput, keys);
        if (subject)
            return subject;
        try {
            return JSON.stringify(toolInput ?? {});
        }
        catch {
            return String(toolInput);
        }
    }
    formatToolActionName(toolName, toolInput, isError) {
        const subject = firstString(toolInput, SUBJECT_KEYS[toolName] ?? ["i"]);
        const label = subject ? `${toolName}: ${subject}` : toolName;
        return isError ? `${label} (failed)` : label;
    }
    formatToolResult(_toolName, _toolInput, result, isError) {
        const body = result.length > MAX_RESULT_LENGTH
            ? `${result.slice(0, MAX_RESULT_LENGTH)}\n\n[truncated]`
            : result;
        return isError ? `Error: ${body}` : body;
    }
}
//# sourceMappingURL=formatter.js.map