/**
 * Claude Message Formatter
 *
 * Implements message formatting for Claude SDK tool messages.
 * This formatter understands Claude's specific tool format and converts
 * tool use/result messages into human-readable content for Linear.
 */
export class ClaudeMessageFormatter {
    /**
     * Format TodoWrite tool parameter as a nice checklist
     */
    formatTodoWriteParameter(jsonContent) {
        try {
            const data = JSON.parse(jsonContent);
            if (!data.todos || !Array.isArray(data.todos)) {
                return jsonContent;
            }
            const todos = data.todos;
            // Keep original order but add status indicators
            let formatted = "\n";
            todos.forEach((todo, index) => {
                let statusEmoji = "";
                if (todo.status === "completed") {
                    statusEmoji = "✅ ";
                }
                else if (todo.status === "in_progress") {
                    statusEmoji = "🔄 ";
                }
                else if (todo.status === "pending") {
                    statusEmoji = "⏳ ";
                }
                formatted += `${statusEmoji}${todo.content}`;
                if (index < todos.length - 1) {
                    formatted += "\n";
                }
            });
            return formatted;
        }
        catch (error) {
            console.error("[ClaudeMessageFormatter] Failed to format TodoWrite parameter:", error);
            return jsonContent;
        }
    }
    /**
     * Format tool input for display in Linear agent activities
     * Converts raw tool inputs into user-friendly parameter strings
     */
    formatToolParameter(toolName, toolInput) {
        // If input is already a string, return it
        if (typeof toolInput === "string") {
            return toolInput;
        }
        try {
            switch (toolName) {
                case "Bash":
                case "↪ Bash": {
                    // Show command only - description goes in action field via formatToolActionName
                    return toolInput.command || JSON.stringify(toolInput);
                }
                case "Read":
                case "↪ Read":
                    if (toolInput.file_path) {
                        let param = toolInput.file_path;
                        if (toolInput.offset !== undefined ||
                            toolInput.limit !== undefined) {
                            const start = toolInput.offset || 0;
                            const end = toolInput.limit ? start + toolInput.limit : "end";
                            param += ` (lines ${start + 1}-${end})`;
                        }
                        return param;
                    }
                    break;
                case "Edit":
                case "↪ Edit":
                    if (toolInput.file_path) {
                        return toolInput.file_path;
                    }
                    break;
                case "Write":
                case "↪ Write":
                    if (toolInput.file_path) {
                        return toolInput.file_path;
                    }
                    break;
                case "Grep":
                case "↪ Grep":
                    if (toolInput.pattern) {
                        let param = `Pattern: \`${toolInput.pattern}\``;
                        if (toolInput.path) {
                            param += ` in ${toolInput.path}`;
                        }
                        if (toolInput.glob) {
                            param += ` (${toolInput.glob})`;
                        }
                        if (toolInput.type) {
                            param += ` [${toolInput.type} files]`;
                        }
                        return param;
                    }
                    break;
                case "Glob":
                case "↪ Glob":
                    if (toolInput.pattern) {
                        let param = `Pattern: \`${toolInput.pattern}\``;
                        if (toolInput.path) {
                            param += ` in ${toolInput.path}`;
                        }
                        return param;
                    }
                    break;
                case "Task":
                case "↪ Task":
                    if (toolInput.description) {
                        return toolInput.description;
                    }
                    break;
                case "WebFetch":
                case "↪ WebFetch":
                    if (toolInput.url) {
                        return toolInput.url;
                    }
                    break;
                case "WebSearch":
                case "↪ WebSearch":
                    if (toolInput.query) {
                        return `Query: ${toolInput.query}`;
                    }
                    break;
                case "NotebookEdit":
                case "↪ NotebookEdit":
                    if (toolInput.notebook_path) {
                        let param = toolInput.notebook_path;
                        if (toolInput.cell_id) {
                            param += ` (cell ${toolInput.cell_id})`;
                        }
                        return param;
                    }
                    break;
                default:
                    // For MCP tools or other unknown tools, try to extract meaningful info
                    if (toolName.startsWith("mcp__")) {
                        // Extract key fields that are commonly meaningful
                        const meaningfulFields = [
                            "query",
                            "id",
                            "issueId",
                            "title",
                            "name",
                            "path",
                            "file",
                        ];
                        for (const field of meaningfulFields) {
                            if (toolInput[field]) {
                                return `${field}: ${toolInput[field]}`;
                            }
                        }
                    }
                    break;
            }
            // Fallback to JSON but make it compact
            return JSON.stringify(toolInput);
        }
        catch (error) {
            console.error("[ClaudeMessageFormatter] Failed to format tool parameter:", error);
            return JSON.stringify(toolInput);
        }
    }
    /**
     * Format tool action name with description for Bash tool
     * Puts the description in round brackets after the tool name in the action field
     */
    formatToolActionName(toolName, toolInput, isError) {
        // Handle Bash tool with description
        if (toolName === "Bash" || toolName === "↪ Bash") {
            // Check if toolInput has a description field
            if (toolInput &&
                typeof toolInput === "object" &&
                "description" in toolInput &&
                toolInput.description) {
                const baseName = isError ? `${toolName} (Error)` : toolName;
                return `${baseName} (${toolInput.description})`;
            }
        }
        // Default formatting for other tools or Bash without description
        return isError ? `${toolName} (Error)` : toolName;
    }
    /**
     * Format tool result for display in Linear agent activities
     * Converts raw tool results into formatted Markdown
     */
    formatToolResult(toolName, toolInput, result, isError) {
        // If there's an error, wrap in error formatting
        if (isError) {
            return `\`\`\`\n${result}\n\`\`\``;
        }
        try {
            switch (toolName) {
                case "Bash":
                case "↪ Bash": {
                    // Show command first if not already in parameter
                    let formatted = "";
                    if (toolInput.command && !toolInput.description) {
                        formatted += `\`\`\`bash\n${toolInput.command}\n\`\`\`\n\n`;
                    }
                    // Then show output
                    if (result?.trim()) {
                        formatted += `\`\`\`\n${result}\n\`\`\``;
                    }
                    else {
                        formatted += "*No output*";
                    }
                    return formatted;
                }
                case "Read":
                case "↪ Read":
                    // For Read, the result is file content - use code block
                    if (result?.trim()) {
                        // Clean up the result: remove line numbers and system-reminder tags
                        let cleanedResult = result;
                        // Remove line numbers (format: "  123→")
                        cleanedResult = cleanedResult.replace(/^\s*\d+→/gm, "");
                        // Remove system-reminder blocks
                        cleanedResult = cleanedResult.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "");
                        // Trim only blank lines (not horizontal whitespace) to preserve indentation
                        cleanedResult = cleanedResult
                            .replace(/^\n+/, "")
                            .replace(/\n+$/, "");
                        // Try to detect language from file extension
                        let lang = "";
                        if (toolInput.file_path) {
                            const ext = toolInput.file_path.split(".").pop()?.toLowerCase();
                            const langMap = {
                                ts: "typescript",
                                tsx: "typescript",
                                js: "javascript",
                                jsx: "javascript",
                                py: "python",
                                rb: "ruby",
                                go: "go",
                                rs: "rust",
                                java: "java",
                                c: "c",
                                cpp: "cpp",
                                cs: "csharp",
                                php: "php",
                                swift: "swift",
                                kt: "kotlin",
                                scala: "scala",
                                sh: "bash",
                                bash: "bash",
                                zsh: "bash",
                                yml: "yaml",
                                yaml: "yaml",
                                json: "json",
                                xml: "xml",
                                html: "html",
                                css: "css",
                                scss: "scss",
                                md: "markdown",
                                sql: "sql",
                            };
                            lang = langMap[ext || ""] || "";
                        }
                        return `\`\`\`${lang}\n${cleanedResult}\n\`\`\``;
                    }
                    return "*Empty file*";
                case "Edit":
                case "↪ Edit": {
                    // For Edit, show changes as a diff
                    // Extract old_string and new_string from toolInput
                    if (toolInput.old_string && toolInput.new_string) {
                        // Format as a unified diff
                        const oldLines = toolInput.old_string.split("\n");
                        const newLines = toolInput.new_string.split("\n");
                        let diff = "```diff\n";
                        // Add context lines before changes (show all old lines with - prefix)
                        for (const line of oldLines) {
                            diff += `-${line}\n`;
                        }
                        // Add new lines with + prefix
                        for (const line of newLines) {
                            diff += `+${line}\n`;
                        }
                        diff += "```";
                        return diff;
                    }
                    // Fallback to result if old/new strings not available
                    if (result?.trim()) {
                        return result;
                    }
                    return "*Edit completed*";
                }
                case "Write":
                case "↪ Write":
                    // For Write, just confirm
                    if (result?.trim()) {
                        return result; // In case there's an error or message
                    }
                    return "*File written successfully*";
                case "Grep":
                case "↪ Grep": {
                    // Format grep results
                    if (result?.trim()) {
                        const lines = result.split("\n");
                        // If it looks like file paths (files_with_matches mode)
                        if (lines.length > 0 &&
                            lines[0] &&
                            !lines[0].includes(":") &&
                            lines[0].trim().length > 0) {
                            return `Found ${lines.filter((l) => l.trim()).length} matching files:\n\`\`\`\n${result}\n\`\`\``;
                        }
                        // Otherwise it's content matches
                        return `\`\`\`\n${result}\n\`\`\``;
                    }
                    return "*No matches found*";
                }
                case "Glob":
                case "↪ Glob": {
                    if (result?.trim()) {
                        const lines = result.split("\n").filter((l) => l.trim());
                        return `Found ${lines.length} matching files:\n\`\`\`\n${result}\n\`\`\``;
                    }
                    return "*No files found*";
                }
                case "Task":
                case "↪ Task":
                    // Task results can be complex - keep as is but in code block if multiline
                    if (result?.trim()) {
                        if (result.includes("\n")) {
                            return `\`\`\`\n${result}\n\`\`\``;
                        }
                        return result;
                    }
                    return "*Task completed*";
                case "WebFetch":
                case "↪ WebFetch":
                case "WebSearch":
                case "↪ WebSearch":
                    // Web results are usually formatted, keep as is
                    return result || "*No results*";
                default:
                    // For unknown tools, use code block if result has multiple lines
                    if (result?.trim()) {
                        if (result.includes("\n") && result.length > 100) {
                            return `\`\`\`\n${result}\n\`\`\``;
                        }
                        return result;
                    }
                    return "*Completed*";
            }
        }
        catch (error) {
            console.error("[ClaudeMessageFormatter] Failed to format tool result:", error);
            return result || "";
        }
    }
}
//# sourceMappingURL=formatter.js.map