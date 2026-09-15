/**
 * JSON-RPC client utilities for F1 CLI
 */
import { error, gray } from "./colors.js";
/**
 * Get the RPC endpoint URL
 */
export function getRpcUrl() {
    const port = process.env.CYRUS_PORT || "3600";
    return `http://localhost:${port}/cli/rpc`;
}
/**
 * Make a JSON-RPC call to the F1 server
 */
export async function rpcCall(method, params) {
    const url = getRpcUrl();
    const requestId = Date.now();
    const request = {
        jsonrpc: "2.0",
        method,
        params: params,
        id: requestId,
    };
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = (await response.json());
        if (data.error) {
            throw new Error(`RPC Error (${data.error.code}): ${data.error.message}`);
        }
        if (data.result === undefined) {
            throw new Error("RPC response missing result");
        }
        return data.result;
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes("ECONNREFUSED")) {
                console.error(error("Cannot connect to F1 server"));
                console.error(gray(`  Tried: ${url}`));
                console.error(gray("  Make sure the F1 server is running"));
                process.exit(1);
            }
            throw err;
        }
        throw new Error("Unknown error during RPC call");
    }
}
/**
 * Print the RPC URL for debugging
 */
export function printRpcUrl() {
    console.error(gray(`RPC: ${getRpcUrl()}`));
}
//# sourceMappingURL=rpc.js.map