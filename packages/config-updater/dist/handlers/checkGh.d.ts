import type { ApiResponse, CheckGhPayload } from "../types.js";
/**
 * Check if GitHub CLI (gh) is installed and authenticated
 *
 * @param _payload - Empty payload (no parameters needed)
 * @param _cyrusHome - Cyrus home directory (not used)
 * @returns ApiResponse with installation and authentication status
 */
export declare function handleCheckGh(_payload: CheckGhPayload, _cyrusHome: string): Promise<ApiResponse>;
//# sourceMappingURL=checkGh.d.ts.map