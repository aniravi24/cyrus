/**
 * Log levels in order of severity
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["SUCCESS"] = 2] = "SUCCESS";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
})(LogLevel || (LogLevel = {}));
/**
 * Simple, zero-dependency logger service with structured logging
 */
export class Logger {
    level;
    prefix;
    timestamps;
    constructor(options = {}) {
        this.level = options.level ?? this.getLogLevelFromEnv();
        this.prefix = options.prefix ?? "";
        this.timestamps = options.timestamps ?? false;
    }
    /**
     * Get log level from environment variable
     */
    getLogLevelFromEnv() {
        const envLevel = process.env.CYRUS_LOG_LEVEL?.toUpperCase();
        switch (envLevel) {
            case "DEBUG":
                return LogLevel.DEBUG;
            case "INFO":
                return LogLevel.INFO;
            case "SUCCESS":
                return LogLevel.SUCCESS;
            case "WARN":
                return LogLevel.WARN;
            case "ERROR":
                return LogLevel.ERROR;
            case "SILENT":
                return LogLevel.SILENT;
            default:
                return LogLevel.INFO;
        }
    }
    /**
     * Format a log message with optional prefix and timestamp
     */
    format(message) {
        let formatted = message;
        if (this.prefix) {
            formatted = `[${this.prefix}] ${formatted}`;
        }
        if (this.timestamps) {
            const timestamp = new Date().toISOString();
            formatted = `${timestamp} ${formatted}`;
        }
        return formatted;
    }
    /**
     * Check if a log level should be output
     */
    shouldLog(level) {
        return level >= this.level;
    }
    /**
     * Debug log (lowest priority)
     */
    debug(message, ...args) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(this.format(`🔍 ${message}`), ...args);
        }
    }
    /**
     * Info log (normal priority)
     */
    info(message, ...args) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.format(message), ...args);
        }
    }
    /**
     * Success log (positive outcome)
     */
    success(message, ...args) {
        if (this.shouldLog(LogLevel.SUCCESS)) {
            console.log(this.format(`✅ ${message}`), ...args);
        }
    }
    /**
     * Warning log
     */
    warn(message, ...args) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.format(`⚠️  ${message}`), ...args);
        }
    }
    /**
     * Error log (highest priority)
     */
    error(message, ...args) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.format(`❌ ${message}`), ...args);
        }
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
            level: this.level,
            prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
            timestamps: this.timestamps,
        });
    }
    /**
     * Print a divider line
     */
    divider(length = 70) {
        this.raw("─".repeat(length));
    }
    /**
     * Set log level dynamically
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * Get current log level
     */
    getLevel() {
        return this.level;
    }
}
/**
 * Default logger instance
 */
export const logger = new Logger();
//# sourceMappingURL=Logger.js.map