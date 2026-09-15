import type { SDKMessage } from "cyrus-core";
import { type SimpleAgentQueryOptions, SimpleAgentRunner } from "cyrus-simple-agent-runner";
export declare class SimpleOpenCodeRunner<T extends string> extends SimpleAgentRunner<T> {
    protected executeAgent(prompt: string, options?: SimpleAgentQueryOptions): Promise<SDKMessage[]>;
    protected extractResponse(messages: SDKMessage[]): string;
    private cleanResponse;
    private handleMessage;
}
//# sourceMappingURL=SimpleOpenCodeRunner.d.ts.map