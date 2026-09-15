import type { Application } from "../Application.js";
import type { Logger } from "../services/Logger.js";
/**
 * Interface for all CLI commands
 */
export interface ICommand {
    /**
     * Execute the command
     * @param args Command-line arguments
     */
    execute(args: string[]): Promise<void>;
}
/**
 * Base class for commands with common functionality
 */
export declare abstract class BaseCommand implements ICommand {
    protected app: Application;
    protected logger: Logger;
    constructor(app: Application);
    abstract execute(args: string[]): Promise<void>;
    /**
     * Helper to exit with error
     */
    protected exitWithError(message: string, code?: number): never;
    /**
     * Helper to log success
     */
    protected logSuccess(message: string): void;
    /**
     * Helper to log error
     */
    protected logError(message: string): void;
    /**
     * Helper to log section divider
     */
    protected logDivider(): void;
}
//# sourceMappingURL=ICommand.d.ts.map