/**
 * ANSI color codes for terminal output
 * No external dependencies - using raw ANSI escape codes
 */
export declare const colors: {
    readonly reset: "\u001B[0m";
    readonly bright: "\u001B[1m";
    readonly dim: "\u001B[2m";
    readonly black: "\u001B[30m";
    readonly red: "\u001B[31m";
    readonly green: "\u001B[32m";
    readonly yellow: "\u001B[33m";
    readonly blue: "\u001B[34m";
    readonly magenta: "\u001B[35m";
    readonly cyan: "\u001B[36m";
    readonly white: "\u001B[37m";
    readonly gray: "\u001B[90m";
    readonly bgBlack: "\u001B[40m";
    readonly bgRed: "\u001B[41m";
    readonly bgGreen: "\u001B[42m";
    readonly bgYellow: "\u001B[43m";
    readonly bgBlue: "\u001B[44m";
    readonly bgMagenta: "\u001B[45m";
    readonly bgCyan: "\u001B[46m";
    readonly bgWhite: "\u001B[47m";
};
/**
 * Helper functions for colored output
 */
export declare function success(text: string): string;
export declare function error(text: string): string;
export declare function warning(text: string): string;
export declare function info(text: string): string;
export declare function bold(text: string): string;
export declare function dim(text: string): string;
export declare function green(text: string): string;
export declare function red(text: string): string;
export declare function yellow(text: string): string;
export declare function cyan(text: string): string;
export declare function gray(text: string): string;
//# sourceMappingURL=colors.d.ts.map