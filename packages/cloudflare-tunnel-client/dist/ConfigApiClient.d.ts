/**
 * Default Cyrus app base URL
 * Can be overridden via CYRUS_APP_URL environment variable for preview environments
 */
export declare const DEFAULT_CYRUS_APP_URL = "https://app.atcyrus.com";
/**
 * Get the Cyrus app base URL from environment variable or use default
 * @returns The Cyrus app base URL (e.g., "https://app.atcyrus.com")
 */
export declare function getCyrusAppUrl(): string;
/**
 * Config API response from cyrus-hosted
 */
export interface ConfigApiResponse {
    success: boolean;
    config?: {
        cloudflareToken: string;
        apiKey: string;
    };
    error?: string;
}
/**
 * Client for retrieving configuration from cyrus-hosted
 * Authenticates using auth keys provided during onboarding
 */
export declare class ConfigApiClient {
    /**
     * Get the config API URL, respecting CYRUS_APP_URL environment variable
     */
    private static getConfigApiUrl;
    /**
     * Retrieve configuration using an auth key
     * @param authKey - The auth key provided during onboarding
     * @returns Configuration containing Cloudflare tunnel token and API key
     */
    static getConfig(authKey: string): Promise<ConfigApiResponse>;
    /**
     * Check if a config response is valid and usable
     */
    static isValid(response: ConfigApiResponse): boolean;
}
//# sourceMappingURL=ConfigApiClient.d.ts.map