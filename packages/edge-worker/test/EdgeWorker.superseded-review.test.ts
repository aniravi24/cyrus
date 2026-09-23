import { describe, expect, it, vi } from "vitest";
import { EdgeWorker, extractReviewRequestSha } from "../src/EdgeWorker.js";

/**
 * A review request for a new PR head stops a running review of an older head
 * and replaces any older request still queued. Exercised against a minimal
 * `this`, the way EdgeWorker.maintenance-mode.test.ts does.
 */

const KEY = "github:prophetiqhq/prophetiq#4536";

function commentEvent(deliveryId: string, body: string) {
	return {
		deliveryId,
		eventType: "issue_comment",
		payload: {
			issue: { number: 4536, pull_request: {} },
			comment: { id: 1, body, user: { login: "github-actions[bot]" } },
			repository: { full_name: "prophetiqhq/prophetiq" },
		},
	};
}

type TestEvent = ReturnType<typeof commentEvent>;

const kickoff = (deliveryId: string, sha: string) =>
	commentEvent(
		deliveryId,
		`@gplpmatch-bot Load the \`review\` skill.\n\n<!-- bot-review-kickoff sha=${sha} -->`,
	);

function harness(activeEvent: unknown, live: boolean) {
	const stop = vi.fn();
	const fakeThis = {
		queuedGitHubPrEvents: new Map<string, TestEvent[]>(),
		activeGitHubPrEvents: new Map<string, unknown>([[KEY, activeEvent]]),
		supersededGitHubDeliveries: new Set<string>(),
		agentSessionManager: {
			getSessionsByIssueId: vi.fn().mockReturnValue([
				{
					id: "session-running",
					agentRunner: { isRunning: () => live, stop },
				},
			]),
			requestSessionStop: vi.fn(),
		},
		logger: { info: vi.fn() },
	};
	const enqueue = (event: unknown): boolean =>
		(
			EdgeWorker.prototype as unknown as {
				enqueueGitHubPrEvent: (key: string, event: unknown) => boolean;
			}
		).enqueueGitHubPrEvent.call(fakeThis, KEY, event);
	return { fakeThis, enqueue, stop };
}

describe("superseded GitHub reviews", () => {
	it("reads the head SHA from kickoff and rescue markers only", () => {
		expect(
			extractReviewRequestSha("<!-- bot-review-kickoff sha=fc6e201 -->"),
		).toBe("fc6e201");
		expect(
			extractReviewRequestSha("<!-- bot-review-rescue sha=ab12cd3 -->"),
		).toBe("ab12cd3");
		expect(extractReviewRequestSha("@gplpmatch-bot fix the lint")).toBeNull();
	});

	it("stops a running review of an older head and suppresses its reply", () => {
		const { fakeThis, enqueue, stop } = harness(
			kickoff("d-old", "aaaaaaa"),
			true,
		);

		expect(enqueue(kickoff("d-new", "bbbbbbb"))).toBe(true);

		expect(stop).toHaveBeenCalledTimes(1);
		expect(
			fakeThis.agentSessionManager.requestSessionStop,
		).toHaveBeenCalledWith("session-running");
		expect(fakeThis.supersededGitHubDeliveries.has("d-old")).toBe(true);
		expect(fakeThis.queuedGitHubPrEvents.get(KEY)).toEqual([
			kickoff("d-new", "bbbbbbb"),
		]);
	});

	it("replaces an older queued review request but keeps other queued work", () => {
		const autofix = commentEvent("d-fix", "@gplpmatch-bot fix finding 1");
		const { fakeThis, enqueue } = harness(autofix, true);
		fakeThis.queuedGitHubPrEvents.set(KEY, [
			kickoff("d-q1", "aaaaaaa"),
			commentEvent("d-human", "@gplpmatch-bot explain this"),
		]);

		enqueue(kickoff("d-q2", "bbbbbbb"));

		const queued = fakeThis.queuedGitHubPrEvents.get(KEY) ?? [];
		expect(queued.map((e) => e.deliveryId)).toEqual(["d-human", "d-q2"]);
	});

	it("never stops a session that is not a review", () => {
		const { enqueue, stop } = harness(
			commentEvent("d-fix", "@gplpmatch-bot fix finding 1"),
			true,
		);

		expect(enqueue(kickoff("d-new", "bbbbbbb"))).toBe(false);
		expect(stop).not.toHaveBeenCalled();
	});

	it("does not restart a review for the head it is already reviewing", () => {
		const { enqueue, stop } = harness(kickoff("d-old", "aaaaaaa"), true);

		expect(
			enqueue(
				commentEvent("d-rescue", "<!-- bot-review-rescue sha=aaaaaaa -->"),
			),
		).toBe(false);
		expect(stop).not.toHaveBeenCalled();
	});

	it("queues a non-review mention behind a running review untouched", () => {
		const { fakeThis, enqueue, stop } = harness(
			kickoff("d-old", "aaaaaaa"),
			true,
		);
		const mention = commentEvent("d-human", "@gplpmatch-bot explain this");

		expect(enqueue(mention)).toBe(false);
		expect(stop).not.toHaveBeenCalled();
		expect(fakeThis.queuedGitHubPrEvents.get(KEY)).toEqual([mention]);
	});
});
