/**
 * List Chat Threads command - List active chat sessions tracked by EdgeWorker.
 */
import { Command } from "commander";
import { error, gray, success } from "../utils/colors.js";
import { formatKeyValue } from "../utils/output.js";
function getUrl() {
    const port = process.env.CYRUS_PORT || "3600";
    return `http://localhost:${port}/cli/chat-threads`;
}
export function createListChatThreadsCommand() {
    const cmd = new Command("list-chat-threads");
    cmd
        .description("List active chat threads tracked by EdgeWorker")
        .action(async () => {
        const url = getUrl();
        console.error(gray(`GET ${url}`));
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = (await response.json());
            if (!data.ok) {
                throw new Error(data.error || "Unknown error");
            }
            const threads = data.threads ?? [];
            if (threads.length === 0) {
                console.log(success("No active chat threads"));
                return;
            }
            console.log(success(`Found ${threads.length} chat thread(s):`));
            for (const t of threads) {
                console.log(`  ${formatKeyValue(t.threadKey, t.sessionId)}`);
            }
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(error(`Failed to list chat threads: ${err.message}`));
                process.exit(1);
            }
            throw err;
        }
    });
    return cmd;
}
//# sourceMappingURL=listChatThreads.js.map