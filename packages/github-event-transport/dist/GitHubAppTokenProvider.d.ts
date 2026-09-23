export interface GitHubAppTokenProviderConfig {
    appId: string;
    installationId: string;
    privateKeyPath: string;
    /** GitHub API base URL (default: https://api.github.com) */
    apiBaseUrl?: string;
}
/**
 * Mints and caches GitHub App installation tokens for self-hosted users.
 *
 * Uses the App's private key to sign a JWT, then exchanges it for a
 * short-lived installation access token via the GitHub API.
 * Tokens are cached and refreshed 5 minutes before expiry.
 */
export declare class GitHubAppTokenProvider {
    private config;
    private cachedToken;
    private expiresAt;
    private privateKeyPromise;
    constructor(config: GitHubAppTokenProviderConfig);
    /**
     * Get a valid installation access token.
     * Returns cached token if still valid, otherwise mints a new one.
     */
    getToken(): Promise<string>;
    private loadPrivateKey;
}
/**
 * Create a JWT for GitHub App authentication.
 * Uses Node's native crypto — no external JWT library needed.
 *
 * @see https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
 */
export declare function createAppJwt(appId: string, privateKey: string): string;
//# sourceMappingURL=GitHubAppTokenProvider.d.ts.map