/**
 * Application constants
 */
/**
 * Default server port for OAuth callbacks and webhooks
 */
export const DEFAULT_SERVER_PORT = 3456;
/**
 * Parse a port number from string with validation
 */
export function parsePort(value, defaultPort) {
    if (!value)
        return defaultPort;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) || parsed < 1 || parsed > 65535
        ? defaultPort
        : parsed;
}
//# sourceMappingURL=constants.js.map