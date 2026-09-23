/**
 * A short-lived GitHub App installation token pushed by cyrus-hosted.
 * One entry per GitHub App installation (org or user account) the team
 * has attached.
 */
export interface GitHubInstallationToken {
    /** GitHub App installation ID this token was minted for */
    installationId: string;
    /** Org/user login the installation belongs to (e.g. "ceedaragents") */
    organization: string | null;
    /** GitHub account type of the installation target */
    accountType: "Organization" | "User" | null;
    /** Short-lived installation access token */
    token: string;
    /** ISO timestamp when the token expires */
    expiresAt: string;
}
/**
 * On-disk shape of `<cyrusHome>/github-tokens.json`.
 */
export interface GitHubTokensFile {
    version: 1;
    updatedAt: string;
    tokens: GitHubInstallationToken[];
}
/** Filename of the token store inside the Cyrus home directory */
export declare const GITHUB_TOKENS_FILENAME = "github-tokens.json";
/**
 * Extract the owner (org or user login) from a GitHub repository URL.
 * Supports:
 *   - https://github.com/owner/name and https://github.com/owner/name.git
 *   - git@github.com:owner/name.git
 *   - ssh://git@github.com/owner/name.git
 *   - github.com/owner/name (no scheme)
 *
 * Returns null for non-GitHub hosts or unparseable URLs.
 */
export declare function extractOwnerFromGitHubUrl(url: string): string | null;
/**
 * Persistent store for per-installation GitHub App tokens, keyed by org.
 *
 * Tokens are pushed by cyrus-hosted via the `/api/update/github-tokens`
 * ConfigUpdater route and consumed lazily by the EdgeWorker (token
 * resolution, session env) and by the git credential helper script.
 *
 * Reads are cached on file mtime+size, so frequent lookups don't re-parse
 * the JSON while still picking up writes from the ConfigUpdater handler
 * (which runs in the same process but writes via this class too) or any
 * external writer.
 */
export declare class GitHubTokenStore {
    private cyrusHome;
    private cachedTokens;
    private cachedMtimeMs;
    private cachedSize;
    constructor(cyrusHome: string);
    /** Absolute path of the token store file */
    get filePath(): string;
    /**
     * Atomically persist the given tokens (write to a temp file, then rename)
     * with owner-only permissions (0600).
     */
    save(tokens: GitHubInstallationToken[]): void;
    /**
     * Load all tokens from disk (including expired ones). Returns an empty
     * array when the file is missing or unreadable/corrupt.
     */
    load(): GitHubInstallationToken[];
    /**
     * All non-expired tokens currently on disk.
     */
    private loadValid;
    /**
     * Return the non-expired token for the given org (case-insensitive),
     * or undefined when no installation matches.
     */
    getTokenForOrg(org: string): string | undefined;
    /**
     * Return the non-expired token for the owner of the given GitHub
     * repository URL (https or ssh form), or undefined when the URL is not
     * a GitHub URL or no installation matches the owner.
     */
    getTokenForRepoUrl(url: string): string | undefined;
    /**
     * When exactly one non-expired token exists, return it (covers
     * single-installation teams where the org name may not match, e.g.
     * user-account installs). Otherwise undefined.
     */
    getFallbackToken(): string | undefined;
}
//# sourceMappingURL=github-token-store.d.ts.map