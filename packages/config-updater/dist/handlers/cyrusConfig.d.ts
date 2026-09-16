import { type ApiResponse } from "../types.js";
/**
 * Handle Cyrus configuration update
 * Updates the ~/.cyrus/config.json file with the provided configuration
 *
 * @param rawPayload - Unvalidated payload from the request
 * @param cyrusHome - Path to the Cyrus home directory
 */
export declare function handleCyrusConfig(rawPayload: unknown, cyrusHome: string): Promise<ApiResponse>;
/**
 * Read current Cyrus configuration
 */
export declare function readCyrusConfig(cyrusHome: string): any;
//# sourceMappingURL=cyrusConfig.d.ts.map