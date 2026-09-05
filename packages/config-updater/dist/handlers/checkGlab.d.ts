import type { ApiResponse, CheckGlabPayload } from "../types.js";
/**
 * Check if GitLab CLI (glab) is installed and authenticated
 *
 * @param _payload - Empty payload (no parameters needed)
 * @param _cyrusHome - Cyrus home directory (not used)
 * @returns ApiResponse with installation and authentication status
 */
export declare function handleCheckGlab(_payload: CheckGlabPayload, _cyrusHome: string): Promise<ApiResponse>;
//# sourceMappingURL=checkGlab.d.ts.map