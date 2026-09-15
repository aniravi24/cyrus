import type { IMessageFormatter } from "cyrus-core";

const MAX_RESULT_LENGTH = 4000;

/** Primary argument per omp tool, used for the one-line activity label. */
const SUBJECT_KEYS: Record<string, string[]> = {
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

function firstString(input: unknown, keys: string[]): string | null {
	if (!input || typeof input !== "object" || Array.isArray(input)) return null;
	const record: Record<string, unknown> = { ...input };
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) return value;
		if (Array.isArray(value) && value.length > 0) return value.join(", ");
	}
	return null;
}

/**
 * Formats omp tool activity for the issue-tracker timeline. omp tool inputs are
 * flat and already named for humans, so the subject is a named argument rather
 * than a per-tool rendering.
 */
export class OmpMessageFormatter implements IMessageFormatter {
	formatTodoWriteParameter(jsonContent: string): string {
		return jsonContent;
	}

	formatTaskParameter(toolName: string, toolInput: unknown): string {
		return this.formatToolParameter(toolName, toolInput);
	}

	formatToolParameter(toolName: string, toolInput: unknown): string {
		const keys = SUBJECT_KEYS[toolName] ?? ["i", "path", "command", "query"];
		const subject = firstString(toolInput, keys);
		if (subject) return subject;
		try {
			return JSON.stringify(toolInput ?? {});
		} catch {
			return String(toolInput);
		}
	}

	formatToolActionName(
		toolName: string,
		toolInput: unknown,
		isError: boolean,
	): string {
		const subject = firstString(toolInput, SUBJECT_KEYS[toolName] ?? ["i"]);
		const label = subject ? `${toolName}: ${subject}` : toolName;
		return isError ? `${label} (failed)` : label;
	}

	formatToolResult(
		_toolName: string,
		_toolInput: unknown,
		result: string,
		isError: boolean,
	): string {
		const body =
			result.length > MAX_RESULT_LENGTH
				? `${result.slice(0, MAX_RESULT_LENGTH)}\n\n[truncated]`
				: result;
		return isError ? `Error: ${body}` : body;
	}
}
