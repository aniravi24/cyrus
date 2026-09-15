import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OMP_ABORT_MARKER, OmpEventMapper } from "./OmpEventMapper.js";
import type { OmpFrame, OmpMessage } from "./types.js";

/** Frames captured from a real `omp --mode rpc` session that read a file. */
const FIXTURE: OmpFrame[] = JSON.parse(
	readFileSync(join(__dirname, "fixtures/read-tool-session.json"), "utf8"),
);

function newMapper(includeThinking = false): OmpEventMapper {
	return new OmpEventMapper({
		includeThinking,
		model: "anthropic/claude-sonnet-4-5",
		tools: ["read"],
		workingDirectory: "/tmp/omp-rpc-spike",
	});
}

function mapAll(mapper: OmpEventMapper, frames: OmpFrame[]) {
	return frames.flatMap((frame) => mapper.map(frame));
}

describe("OmpEventMapper", () => {
	// Both cases below shipped to staging and were observed on live PRs: a review
	// posted omp's `xd://` mount notice as its verdict, and every session reported
	// success after producing nothing, so no gate was ever released.
	it("keeps infrastructure notices out of the assistant stream", () => {
		const messages = mapAll(newMapper(), [
			{
				type: "notice",
				message: "xd://: mounted mcp__sentry_find_projects",
			} as unknown as OmpFrame,
		]);

		expect(messages).toHaveLength(0);
	});

	it("aborts instead of claiming success when a run produced no model output", () => {
		const messages = mapAll(newMapper(), [
			{
				type: "notice",
				message: "xd://: mounted mcp__sentry_find_projects",
			} as unknown as OmpFrame,
			{ type: "agent_end", isTerminal: true } as unknown as OmpFrame,
		]);

		const result = messages.find((message) => message.type === "result");
		expect(result?.type === "result" && result.subtype).toBe(
			"error_during_execution",
		);
		expect(result?.type === "result" && result.is_error).toBe(true);

		const assistantText = messages
			.filter((message) => message.type === "assistant")
			.flatMap((message) =>
				message.type === "assistant"
					? message.message.content.map((block) =>
							block.type === "text" ? block.text : "",
						)
					: [],
			)
			.join(" ");
		expect(assistantText).toContain(OMP_ABORT_MARKER);
	});

	it("pairs a tool call with its result across the two frames that carry it", () => {
		const messages = mapAll(newMapper(), FIXTURE);
		const toolUse = messages.find(
			(message) =>
				message.type === "assistant" &&
				message.message.content.some((block) => block.type === "tool_use"),
		);
		const toolResult = messages.find((message) => message.type === "user");

		expect(toolUse).toBeDefined();
		expect(toolResult).toBeDefined();
		const use =
			toolUse?.type === "assistant" ? toolUse.message.content[0] : null;
		const result =
			toolResult?.type === "user" ? toolResult.message.content[0] : null;
		expect(use).toMatchObject({
			name: "read",
			input: { path: "target.txt" },
			type: "tool_use",
		});
		expect(result).toMatchObject({
			is_error: false,
			tool_use_id: use && "id" in use ? use.id : "",
			type: "tool_result",
		});
		// The captured result body is the file the session read.
		expect(
			result && "content" in result ? String(result.content) : "",
		).toContain("TODO: fix me");
	});

	it("ends the run with a result message carrying the final assistant text", () => {
		const messages = mapAll(newMapper(), FIXTURE);
		const last = messages[messages.length - 1];
		expect(last?.type).toBe("result");
		if (last?.type !== "result") return;
		expect(last.subtype).toBe("success");
		expect(last.is_error).toBe(false);
		expect("result" in last ? last.result : "").toContain("3");
	});

	it("treats a non-terminal agent_end as mid-run, not completion", () => {
		const mapper = newMapper();
		expect(
			mapper.map({ isTerminal: false, messages: [], type: "agent_end" }),
		).toEqual([]);
		// Terminal ends a run; whether that run boundary is a success or an abort
		// is the empty-output test's business, so assert only the boundary here.
		expect(
			mapper
				.map({ isTerminal: true, messages: [], type: "agent_end" })
				.some((message) => message.type === "result"),
		).toBe(true);
	});

	it("synthesizes a tool_use when only the end frame is seen after a resume", () => {
		const messages = newMapper().map({
			isError: true,
			result: { content: [{ text: "boom", type: "text" }] },
			toolCallId: "toolu_orphan",
			toolName: "bash",
			type: "tool_execution_end",
		});
		expect(messages.map((message) => message.type)).toEqual([
			"assistant",
			"user",
		]);
		const result =
			messages[1]?.type === "user" ? messages[1].message.content[0] : null;
		expect(result).toMatchObject({
			is_error: true,
			tool_use_id: "toolu_orphan",
		});
	});

	it("omits thinking unless the session opts in", () => {
		const message: OmpMessage = {
			content: [
				{ thinking: "internal reasoning", type: "thinking" },
				{ text: "answer", type: "text" },
			],
			role: "assistant",
		};
		const withoutThinking = newMapper().map({ message, type: "message_end" });
		const withThinking = newMapper(true).map({ message, type: "message_end" });
		expect(withoutThinking).toHaveLength(1);
		expect(withThinking).toHaveLength(2);
	});

	it("labels subagent progress so task fan-out is visible in the timeline", () => {
		const messages = newMapper().map({
			label: "scout",
			message: "reading src/index.ts",
			type: "subagent_progress",
		});
		const block =
			messages[0]?.type === "assistant" ? messages[0].message.content[0] : null;
		expect(block && "text" in block ? block.text : "").toBe(
			"[scout] reading src/index.ts",
		);
	});
});
