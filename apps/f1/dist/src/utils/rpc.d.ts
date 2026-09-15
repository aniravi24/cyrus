/**
 * JSON-RPC client utilities for F1 CLI
 */
/**
 * Get the RPC endpoint URL
 */
export declare function getRpcUrl(): string;
/**
 * Make a JSON-RPC call to the F1 server
 */
export declare function rpcCall<T = unknown>(method: string, params?: unknown): Promise<T>;
/**
 * Print the RPC URL for debugging
 */
export declare function printRpcUrl(): void;
//# sourceMappingURL=rpc.d.ts.map