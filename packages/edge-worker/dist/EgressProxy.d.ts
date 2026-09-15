import type { NetworkPolicy, SandboxConfig } from "cyrus-core";
import { type ILogger } from "cyrus-core";
/**
 * EgressProxy provides an HTTP/HTTPS forward proxy for Claude Code sandbox
 * network egress control.
 *
 * Scope: The SDK's sandbox.network proxy only intercepts traffic from
 * Bash tool subprocesses (git, gh, npm, curl, etc.). Claude's own inference
 * API calls, MCP server traffic, and built-in file tools (Read/Edit/Write)
 * are NOT routed through this proxy.
 * @see https://docs.anthropic.com/en/docs/claude-code/security#sandbox
 *
 * Capabilities:
 * - Domain-based allow/deny filtering for subprocess traffic
 * - TLS termination (MITM) for domains with header transform rules
 * - Per-domain header injection (credentials brokering)
 * - Request logging
 *
 * Architecture follows the Vercel Sandbox Firewall pattern:
 * @see https://vercel.com/docs/vercel-sandbox/concepts/firewall
 *
 * TLS termination is selective — only domains with transform rules get intercepted.
 * A per-instance CA certificate is generated and must be trusted by the client
 * via NODE_EXTRA_CA_CERTS.
 */
export declare class EgressProxy {
    private httpServer;
    private socksServer;
    private openSockets;
    private httpProxyPort;
    private socksProxyPort;
    private networkPolicy;
    private logRequests;
    private logger;
    /** CA key pair and certificate for on-the-fly cert generation */
    private caKey;
    private caCert;
    private caKeyPem;
    private caCertPem;
    /** Path where the CA cert PEM is written for NODE_EXTRA_CA_CERTS */
    private caCertPath;
    /** Directory where cert files are stored */
    private certsDir;
    /** Cache of generated server certificates keyed by hostname */
    private certCache;
    /** Set of domains that require TLS termination (have transform rules) */
    private tlsTerminationDomains;
    /** Merged header transforms keyed by domain pattern */
    private domainTransforms;
    /** Set of allowed domain patterns (if policy specifies allow rules) */
    private allowedDomains;
    private isRunning;
    constructor(config: SandboxConfig, cyrusHome: string, logger?: ILogger);
    /**
     * Get the path to the CA certificate PEM file.
     * This should be set as NODE_EXTRA_CA_CERTS for child processes.
     */
    getCACertPath(): string;
    /**
     * Build a CA cert bundle that includes the proxy CA and any pre-existing
     * cert file (e.g., corporate proxy CA). NODE_EXTRA_CA_CERTS accepts a
     * single file path, so we concatenate all PEM certs into one bundle.
     *
     * Checks (in order): explicit existingCertPath arg, then the host
     * process's NODE_EXTRA_CA_CERTS env var. If neither is set or the file
     * doesn't exist, returns the proxy CA cert path unchanged.
     */
    buildCACertBundle(existingCertPath?: string): string;
    /**
     * Get configured HTTP proxy port.
     */
    getHttpProxyPort(): number;
    /**
     * Get configured SOCKS proxy port.
     */
    getSocksProxyPort(): number;
    /**
     * Start the egress proxy servers.
     */
    start(): Promise<void>;
    /**
     * Log a human-readable summary of the active network policy.
     */
    private logPolicySummary;
    /** Track an accepted socket so stop() can force-close it. */
    private trackSocket;
    /**
     * Stop the egress proxy servers.
     */
    stop(): Promise<void>;
    /**
     * Update the network policy at runtime without restarting.
     */
    updateNetworkPolicy(policy: NetworkPolicy): void;
    private generateCA;
    private generateServerCert;
    private parsePolicy;
    /**
     * Check if a hostname is allowed by the network policy.
     *
     * Three modes (matching Vercel Sandbox Firewall):
     * - allow-all: no networkPolicy or no allow rules → all traffic passes
     * - deny-all: networkPolicy with empty allow → all traffic blocked
     * - user-defined: networkPolicy with allow rules → deny-all default,
     *   only listed domains pass
     *
     * Only Bash-spawned subprocess traffic reaches this proxy (git, gh,
     * npm, curl, etc.). Claude's inference API and MCP traffic bypass it.
     */
    private isDomainAllowed;
    /**
     * Match a hostname against policy domain patterns.
     * Returns the matching pattern or null.
     */
    private matchDomain;
    /**
     * Match hostname against a domain pattern.
     * Supports:
     * - Leading wildcard: *.example.com matches sub.example.com but NOT example.com
     * - Mid-segment wildcard: www.*.com matches www.foo.com
     */
    private matchesPattern;
    /**
     * Get the resolved transforms for a domain, if any.
     */
    private getTransformsForDomain;
    /**
     * Check if a domain requires TLS termination (has transform rules).
     */
    private requiresTlsTermination;
    private startHttpProxy;
    /**
     * Handle plain HTTP proxy requests (non-CONNECT).
     */
    private handleHttpRequest;
    /**
     * Handle HTTPS CONNECT tunneling.
     * For domains with transform rules: TLS-terminate, modify headers, re-encrypt.
     * For other allowed domains: TCP passthrough.
     */
    private handleConnect;
    /**
     * Direct TCP tunnel (no TLS termination).
     */
    private handleTcpTunnel;
    /**
     * TLS termination for domains with transform rules.
     * Spins up a local HTTPS server on an ephemeral port, bridges
     * the client socket to it, then forwards decrypted HTTP upstream
     * with injected headers.
     */
    private handleTlsTermination;
    private startSocksProxy;
    /**
     * Handle SOCKS5 connection.
     * Implements the SOCKS5 handshake (RFC 1928) with no-auth only,
     * then tunnels the connection like CONNECT.
     */
    private handleSocksConnection;
}
//# sourceMappingURL=EgressProxy.d.ts.map