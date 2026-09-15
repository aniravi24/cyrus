/**
 * Ping command - Health check for F1 server
 */
import { Command } from "commander";
import { error, success } from "../utils/colors.js";
import { printRpcUrl, rpcCall } from "../utils/rpc.js";
export function createPingCommand() {
    const cmd = new Command("ping");
    cmd
        .description("Health check - verify F1 server is responding")
        .action(async () => {
        printRpcUrl();
        try {
            const result = await rpcCall("ping");
            console.log(success("Server is healthy"));
            console.log(`  Status: ${result.status}`);
            console.log(`  Timestamp: ${result.timestamp}`);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(error(`Ping failed: ${err.message}`));
                process.exit(1);
            }
            throw err;
        }
    });
    return cmd;
}
//# sourceMappingURL=ping.js.map