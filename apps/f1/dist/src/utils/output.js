/**
 * Output formatting utilities for F1 CLI
 */
import { bold, cyan, dim, gray, green } from "./colors.js";
/**
 * Format a key-value pair for display
 */
export function formatKeyValue(key, value) {
    return `${cyan(key)}: ${value}`;
}
/**
 * Format a section header
 */
export function formatHeader(text) {
    return `\n${bold(text)}`;
}
/**
 * Format a list item
 */
export function formatListItem(text, indent = 0) {
    const prefix = "  ".repeat(indent);
    return `${prefix}${green("•")} ${text}`;
}
/**
 * Format a timestamp
 */
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return dim(date.toLocaleString());
}
/**
 * Format JSON output
 */
export function formatJson(data) {
    return JSON.stringify(data, null, 2);
}
/**
 * Print a table-like structure
 */
export function printTable(headers, rows) {
    // Calculate column widths
    const widths = headers.map((header, i) => {
        const cellWidths = rows.map((row) => row[i]?.length || 0);
        return Math.max(header.length, ...cellWidths);
    });
    // Print header
    const headerRow = headers
        .map((h, i) => bold(h.padEnd(widths[i] || 0)))
        .join("  ");
    console.log(headerRow);
    console.log(gray("─".repeat(headerRow.length)));
    // Print rows
    for (const row of rows) {
        const rowStr = row
            .map((cell, i) => (cell || "").padEnd(widths[i] || 0))
            .join("  ");
        console.log(rowStr);
    }
}
/**
 * Truncate text to a maximum length
 */
export function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return `${text.slice(0, maxLength - 3)}...`;
}
//# sourceMappingURL=output.js.map