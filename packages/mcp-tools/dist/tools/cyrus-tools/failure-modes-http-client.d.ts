import type { FailureModesHttpClient } from "./log-failure-mode.js";
export interface FetchFailureModesClientOptions {
    /**
     * Base URL of the cyrus-hosted control plane (e.g.
     * `https://app.atcyrus.com`). Trailing slashes are tolerated.
     */
    baseUrl: string;
    /**
     * The `CYRUS_API_KEY` bearer token. Auth is reverse-looked-up server-side
     * against both `cyrus_api_key` (self-host) and `droplet_api_key_encrypted`
     * (cloud) columns.
     */
    apiKey: string;
    /** Optional fetch override for testing. */
    fetchImpl?: typeof fetch;
    /** Optional timeout in ms; defaults to 15s. */
    timeoutMs?: number;
}
export declare function createFetchFailureModesClient(options: FetchFailureModesClientOptions): FailureModesHttpClient;
//# sourceMappingURL=failure-modes-http-client.d.ts.map