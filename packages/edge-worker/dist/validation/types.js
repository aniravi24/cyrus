/**
 * Types for the validation loop system
 */
import { z } from "zod";
/**
 * Zod schema for ValidationResult - the single source of truth
 * Used with Claude SDK structured outputs
 */
export const ValidationResultSchema = z.object({
    /** Whether all verifications passed */
    pass: z.boolean().describe("Whether all verifications passed"),
    /** Summary of validation results or failure reasons */
    reason: z
        .string()
        .describe("Summary of validation results (e.g., '47 tests passing, linting clean, types valid') or failure reasons (e.g., 'TypeScript error in src/foo.ts:42 - Property x does not exist on type Y')"),
});
/**
 * JSON Schema for ValidationResult - converted from Zod schema using Zod v4's native toJSONSchema()
 * Used with Claude SDK structured outputs
 */
export const VALIDATION_RESULT_SCHEMA = ValidationResultSchema.toJSONSchema();
/**
 * Default validation loop configuration
 */
export const DEFAULT_VALIDATION_LOOP_CONFIG = {
    maxIterations: 4,
    continueOnMaxRetries: true,
};
//# sourceMappingURL=types.js.map