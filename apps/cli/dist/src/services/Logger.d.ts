import { type ILogger, type LogContext, type LogEventAttributes, type LogLevel } from "cyrus-core";
export { LogLevel } from "cyrus-core";
/**
 * Logger configuration options
 */
export interface LoggerOptions {
    /** Minimum log level to output */
    level?: LogLevel;
    /** Prefix to add to all log messages (used as component name) */
    prefix?: string;
    /** Whether to include timestamps */
    timestamps?: boolean;
}
/**
 * CLI-specific logger that wraps the core ILogger.
 *
 * Provides CLI-presentation features (emoji formatting, raw output,
 * dividers, child loggers) on top of the standard core logging interface.
 *
 * Implements ILogger so it can be passed to packages that expect the core interface.
 */
export declare class Logger implements ILogger {
    private coreLogger;
    private prefix;
    private timestamps;
    constructor(options?: LoggerOptions);
    /**
     * Debug log (lowest priority)
     */
    debug(message: string, ...args: any[]): void;
    /**
     * Info log (normal priority)
     */
    info(message: string, ...args: any[]): void;
    /**
     * Success log - maps to info level with check mark prefix
     */
    success(message: string, ...args: any[]): void;
    /**
     * Warning log
     */
    warn(message: string, ...args: any[]): void;
    /**
     * Error log (highest priority)
     */
    error(message: string, ...args: any[]): void;
    /**
     * Emit a named major event. Delegates to the core logger so event-stream
     * forwarding goes through the same Sentry Logs gate as the rest of the
     * codebase — keeps the CLI's presentation wrapper Liskov-compatible with
     * the core ILogger contract.
     */
    event(name: string, attributes?: LogEventAttributes): void;
    /**
     * Raw output without formatting (always outputs regardless of level)
     */
    raw(message: string, ...args: any[]): void;
    /**
     * Create a child logger with a prefix
     */
    child(prefix: string): Logger;
    /**
     * Print a divider line
     */
    divider(length?: number): void;
    /**
     * Create a new logger with additional context.
     * Delegates to the core logger's withContext.
     */
    withContext(context: LogContext): ILogger;
    /**
     * Set log level dynamically
     */
    setLevel(level: LogLevel): void;
    /**
     * Get current log level
     */
    getLevel(): LogLevel;
}
/**
 * Default logger instance
 */
export declare const logger: Logger;
//# sourceMappingURL=Logger.d.ts.map