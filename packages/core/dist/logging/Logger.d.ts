import type { ILogger, LogContext } from "./ILogger.js";
import { LogLevel } from "./ILogger.js";
export declare function createLogger(options: {
    component: string;
    level?: LogLevel;
    context?: LogContext;
}): ILogger;
//# sourceMappingURL=Logger.d.ts.map