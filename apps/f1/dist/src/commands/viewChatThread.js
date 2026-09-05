/**
 * View Chat Thread command - Read the latest assistant reply for a chat
 * thread tracked by EdgeWorker. Optionally polls until a message arrives.
 */
import { Command } from "commander";
import { dim, error, gray, success } from "../utils/colors.js";
import { formatKeyValue } from "../utils/output.js";
function getUrl(threadKey) {
    const port = process.env.CYRUS_PORT || "3600";
    const params = new URLSearchParams({ threadKey });
    return `http://localhost:${port}/cli/chat-thread?${params.toString()}`;
}
async function fetchOnce(threadKey) {
    const response = await fetch(getUrl(threadKey));
    if (response.status === 404)
        return null;
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return (await response.json());
}
export function createViewChatThreadCommand() {
    const cmd = new Command("view-chat-thread");
    cmd
        .description("View the latest assistant reply for a chat thread")
        .requiredOption("-k, --thread-key <key>", "Thread key (e.g. 'C_TEST:1234567890.000')")
        .option("-w, --wait", "Poll until the runner is no longer running or an assistant reply is present")
        .option("--timeout <seconds>", "Maximum seconds to wait when --wait is set", "60")
        .action(async (options) => {
        console.error(gray(`GET ${getUrl(options.threadKey)}`));
        const deadline = Date.now() + Number(options.timeout) * 1000;
        try {
            let result = null;
            do {
                result = await fetchOnce(options.threadKey);
                if (!options.wait)
                    break;
                if (result && (!result.isRunning || result.text))
                    break;
                if (Date.now() >= deadline)
                    break;
                await new Promise((r) => setTimeout(r, 1000));
            } while (options.wait);
            if (!result) {
                console.error(error(`Thread not found: ${options.threadKey}`));
                process.exit(1);
            }
            if (!result.ok) {
                throw new Error(result.error || "Unknown error");
            }
            console.log(success(`Chat thread ${result.threadKey}`));
            console.log(`  ${formatKeyValue("Running", String(result.isRunning))}`);
            console.log(`  ${formatKeyValue("Message Count", String(result.messageCount ?? 0))}`);
            console.log(dim("--- Latest assistant reply ---"));
            console.log(result.text || dim("(no assistant reply yet)"));
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(error(`Failed to view chat thread: ${err.message}`));
                process.exit(1);
            }
            throw err;
        }
    });
    return cmd;
}
//# sourceMappingURL=viewChatThread.js.map