/**
 * Output formatting utilities for F1 CLI
 */
/**
 * Format a key-value pair for display
 */
export declare function formatKeyValue(key: string, value: string | number): string;
/**
 * Format a section header
 */
export declare function formatHeader(text: string): string;
/**
 * Format a list item
 */
export declare function formatListItem(text: string, indent?: number): string;
/**
 * Format a timestamp
 */
export declare function formatTimestamp(timestamp: string): string;
/**
 * Format JSON output
 */
export declare function formatJson(data: unknown): string;
/**
 * Print a table-like structure
 */
export declare function printTable(headers: string[], rows: string[][]): void;
/**
 * Truncate text to a maximum length
 */
export declare function truncate(text: string, maxLength: number): string;
//# sourceMappingURL=output.d.ts.map