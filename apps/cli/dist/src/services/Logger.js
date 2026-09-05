import { createLogger, } from "cyrus-core";
// Re-export LogLevel from cyrus-core so existing consumers don't break
export { LogLevel } from "cyrus-core";
/**
 * CLI-specific logger that wraps the core ILogger.
 *
 * Provides CLI-presentation features (emoji formatting, raw output,
 * dividers, child loggers) on top of the standard core logging interface.
 *
 * Implements ILogger so it can be passed to packages that expect the core interface.
 */
export class Logger {
    coreLogger;
    prefix;
    timestamps;
    constructor(options = {}) {
        this.prefix = options.prefix ?? "";
        this.timestamps = options.timestamps ?? false;
        this.coreLogger = createLogger({
            component: this.prefix || "CLI",
            level: options.level,
        });
    }
    /**
     * Debug log (lowest priority)
     */
    debug(message, ...args) {
        this.coreLogger.debug(message, ...args);
    }
    /**
     * Info log (normal priority)
     */
    info(message, ...args) {
        this.coreLogger.info(message, ...args);
    }
    /**
     * Success log - maps to info level with check mark prefix
     */
    success(message, ...args) {
        this.coreLogger.info(message, ...args);
    }
    /**
     * Warning log
     */
    warn(message, ...args) {
        this.coreLogger.warn(message, ...args);
    }
    /**
     * Error log (highest priority)
     */
    error(message, ...args) {
        this.coreLogger.error(message, ...args);
    }
    /**
     * Emit a named major event. Delegates to the core logger so event-stream
     * forwarding goes through the same Sentry Logs gate as the rest of the
     * codebase — keeps the CLI's presentation wrapper Liskov-compatible with
     * the core ILogger contract.
     */
    event(name, attributes) {
        this.coreLogger.event(name, attributes);
    }
    /**
     * Raw output without formatting (always outputs regardless of level)
     */
    raw(message, ...args) {
        console.log(message, ...args);
    }
    /**
     * Create a child logger with a prefix
     */
    child(prefix) {
        return new Logger({
            level: this.coreLogger.getLevel(),
            prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
            timestamps: this.timestamps,
        });
    }
    /**
     * Print a divider line
     */
    divider(length = 70) {
        this.raw("\u2500".repeat(length));
    }
    /**
     * Create a new logger with additional context.
     * Delegates to the core logger's withContext.
     */
    withContext(context) {
        return this.coreLogger.withContext(context);
    }
    /**
     * Set log level dynamically
     */
    setLevel(level) {
        this.coreLogger.setLevel(level);
    }
    /**
     * Get current log level
     */
    getLevel() {
        return this.coreLogger.getLevel();
    }
}
/**
 * Default logger instance
 */
export const logger = new Logger();
//# sourceMappingURL=Logger.js.map