/**
 * Base class for commands with common functionality
 */
export class BaseCommand {
    app;
    logger;
    constructor(app) {
        this.app = app;
        this.logger = app.logger;
    }
    /**
     * Helper to exit with error
     */
    exitWithError(message, code = 1) {
        this.logger.error(message);
        process.exit(code);
    }
    /**
     * Helper to log success
     */
    logSuccess(message) {
        this.logger.success(message);
    }
    /**
     * Helper to log error
     */
    logError(message) {
        this.logger.error(message);
    }
    /**
     * Helper to log section divider
     */
    logDivider() {
        this.logger.divider(50);
    }
}
//# sourceMappingURL=ICommand.js.map