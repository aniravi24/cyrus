import type { AgentActivityContent } from "cyrus-core";
import type { ActivityPostOptions, ActivityPostResult, IActivitySink } from "./IActivitySink.js";
/**
 * A no-op activity sink that silently discards all activities.
 * Used for platforms like Slack where activities are not posted to an external tracker.
 */
export declare class NoopActivitySink implements IActivitySink {
    readonly id: string;
    constructor(id?: string);
    postActivity(_sessionId: string, _activity: AgentActivityContent, _options?: ActivityPostOptions): Promise<ActivityPostResult>;
    createAgentSession(_issueId: string): Promise<string>;
}
//# sourceMappingURL=NoopActivitySink.d.ts.map