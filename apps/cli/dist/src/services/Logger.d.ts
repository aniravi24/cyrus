/**
 * Log levels in order of severity
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    SUCCESS = 2,
    WARN = 3,
    ERROR = 4,
    SILENT = 5
}
/**
 * Logger configuration options
 */
export interface LoggerOptions {
    /** Minimum log level to output */
    level?: LogLevel;
    /** Prefix to add to all log messages */
    prefix?: string;
    /** Whether to include timestamps */
    timestamps?: boolean;
}
/**
 * Simple, zero-dependency logger service with structured logging
 */
export declare class Logger {
    private level;
    private prefix;
    private timestamps;
    constructor(options?: LoggerOptions);
    /**
     * Get log level from environment variable
     */
    private getLogLevelFromEnv;
    /**
     * Format a log message with optional prefix and timestamp
     */
    private format;
    /**
     * Check if a log level should be output
     */
    private shouldLog;
    /**
     * Debug log (lowest priority)
     */
    debug(message: string, ...args: any[]): void;
    /**
     * Info log (normal priority)
     */
    info(message: string, ...args: any[]): void;
    /**
     * Success log (positive outcome)
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