/**
 * ValidationLoopController - Orchestrates the validation loop with retry logic
 *
 * This controller manages the validation loop that runs verifications and fixes
 * up to a configurable maximum number of iterations.
 */
import type { ValidationFixerContext, ValidationLoopConfig, ValidationLoopState, ValidationResult } from "./types.js";
import { VALIDATION_RESULT_SCHEMA } from "./types.js";
/**
 * Parse a validation result from an agent's response
 *
 * Supports multiple formats:
 * 1. Native structured output (message.structured_output) - validated with Zod
 * 2. JSON in response text - validated with Zod
 * 3. Fallback prompt engineering extraction (for Gemini and other runners)
 */
export declare function parseValidationResult(response: string | undefined, structuredOutput?: unknown): ValidationResult;
/**
 * Get the JSON schema for validation results
 */
export declare function getValidationResultSchema(): typeof VALIDATION_RESULT_SCHEMA;
/**
 * Load the validation-fixer prompt template
 */
export declare function loadValidationFixerPrompt(): string;
/**
 * Render the validation-fixer prompt with context
 */
export declare function renderValidationFixerPrompt(context: ValidationFixerContext): string;
/**
 * Create initial validation loop state
 */
export declare function createInitialState(): ValidationLoopState;
/**
 * Record a validation attempt and determine next action
 */
export declare function recordAttempt(state: ValidationLoopState, result: ValidationResult, config?: ValidationLoopConfig): ValidationLoopState;
/**
 * Get the fixer context for the current state
 */
export declare function getFixerContext(state: ValidationLoopState, config?: ValidationLoopConfig): ValidationFixerContext | null;
/**
 * Check if the validation loop should continue
 */
export declare function shouldContinueLoop(state: ValidationLoopState): boolean;
/**
 * Check if we should proceed to the next subroutine after validation
 */
export declare function shouldProceedAfterValidation(state: ValidationLoopState, config?: ValidationLoopConfig): boolean;
/**
 * Get a summary of the validation loop execution
 */
export declare function getValidationSummary(state: ValidationLoopState): string;
//# sourceMappingURL=ValidationLoopController.d.ts.map