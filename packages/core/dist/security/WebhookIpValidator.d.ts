import { type ILogger } from "../logging/index.js";
/**
 * Known webhook source IPs/CIDRs for supported providers.
 *
 * Linear: https://linear.app/developers/webhooks#securing-webhooks
 * GitHub: https://api.github.com/meta (hooks field)
 * GitLab: https://docs.gitlab.com/ee/user/gitlab_com/#ip-range
 */
export declare const LINEAR_WEBHOOK_IPS: readonly ["35.231.147.226", "35.243.134.228", "35.196.141.51", "34.140.253.14", "34.38.87.206", "34.62.119.29", "34.134.222.122", "35.222.25.142", "34.60.255.158"];
/**
 * Fallback GitHub webhook CIDRs (from /meta API as of 2025).
 * These are used when the /meta API is unavailable.
 */
export declare const GITHUB_WEBHOOK_CIDRS_FALLBACK: readonly ["192.30.252.0/22", "185.199.108.0/22", "140.82.112.0/20", "143.55.64.0/20"];
/**
 * GitLab.com webhook source IPs.
 * https://docs.gitlab.com/ee/user/gitlab_com/#ip-range
 */
export declare const GITLAB_WEBHOOK_CIDRS: readonly ["34.74.90.64/28", "34.74.226.0/24"];
export type WebhookProvider = "linear" | "github" | "gitlab";
/**
 * Parse a CIDR notation string into a base IP (as 32-bit number) and mask.
 * Supports both plain IPs ("1.2.3.4") and CIDR notation ("1.2.3.4/24").
 */
export declare function parseCidr(cidr: string): {
    base: number;
    mask: number;
};
/**
 * Convert an IPv4 address string to a 32-bit unsigned integer.
 */
export declare function ipToNumber(ip: string): number;
/**
 * Check if an IPv4 address matches a CIDR range or exact IP.
 */
export declare function ipMatchesCidr(ip: string, cidr: string): boolean;
/**
 * Normalize an IP address by stripping IPv4-mapped IPv6 prefix (::ffff:).
 * Returns the raw IPv4 string if it was mapped, otherwise returns the original.
 */
export declare function normalizeIp(ip: string): string;
/**
 * Check if an IP address matches any entry in an allowlist of IPs/CIDRs.
 */
export declare function ipMatchesAllowlist(ip: string, allowlist: readonly string[]): boolean;
/**
 * Options for creating a WebhookIpValidator
 */
export interface WebhookIpValidatorOptions {
    /** Enable or disable IP validation globally */
    enabled?: boolean;
    /** Custom allowlists to merge with (or replace) defaults */
    customAllowlists?: Partial<Record<WebhookProvider, readonly string[]>>;
    /** Logger instance */
    logger?: ILogger;
}
/**
 * Validates webhook source IPs against known provider allowlists.
 *
 * For GitHub, call `refreshGitHubAllowlist()` after construction to fetch
 * the latest CIDRs from the /meta API. Falls back to a static list if
 * the API is unavailable.
 */
export declare class WebhookIpValidator {
    private allowlists;
    private enabled;
    private logger;
    constructor(options?: WebhookIpValidatorOptions);
    /**
     * Fetch the latest GitHub webhook CIDRs from the /meta API and update the allowlist.
     * Falls back to the static fallback list on failure.
     */
    refreshGitHubAllowlist(): Promise<void>;
    /**
     * Validate an IP address against the allowlist for the given provider.
     * Returns true if:
     * - IP validation is disabled
     * - The IP matches the provider's allowlist
     *
     * Returns false if the IP does not match.
     */
    validate(ip: string, provider: WebhookProvider): boolean;
    /**
     * Whether IP validation is currently enabled.
     */
    isEnabled(): boolean;
    /**
     * Get the current allowlist for a provider (for debugging/logging).
     */
    getAllowlist(provider: WebhookProvider): readonly string[];
}
//# sourceMappingURL=WebhookIpValidator.d.ts.map