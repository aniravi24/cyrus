/**
 * A no-op activity sink that silently discards all activities.
 * Used for platforms like Slack where activities are not posted to an external tracker.
 */
export class NoopActivitySink {
    id;
    constructor(id = "noop") {
        this.id = id;
    }
    async postActivity(_sessionId, _activity, _options) {
        return {};
    }
    async createAgentSession(_issueId) {
        return "";
    }
}
//# sourceMappingURL=NoopActivitySink.js.map