/**
 * Single source of truth for the failure-mode self-reporting instructions
 * appended to every customer-facing system prompt.
 *
 * Covered entrypoints (see `RunnerConfigBuilder.applyFailureModeAddendum`):
 *   - Linear issue sessions — all 5 prompt flavors (builder, debugger,
 *     scoper, orchestrator, graphite-orchestrator).
 *   - Slack chat sessions.
 *   - GitHub PR chat sessions.
 *
 * The text deliberately keeps the trigger conditions concrete (user-visible
 * failure patterns, repeated-correction and 3+-attempt thresholds) while also
 * carving out ordinary review/iteration. It reminds the model to quote the
 * user verbatim and paste its own failing output rather than a paraphrase.
 * Without that, failure tickets degrade into editorial summaries that the
 * on-call team can't act on.
 *
 * Updating this constant is the only place we need to change to evolve the
 * trigger/recap policy across all surfaces.
 */
export declare const FAILURE_MODE_PROMPT_ADDENDUM: string;
/**
 * Append the failure-mode addendum to a system prompt fragment, normalizing
 * spacing so the boundary doesn't collide with prior content.
 */
export declare function appendFailureModeAddendum(existing: string | undefined | null): string;
//# sourceMappingURL=failureModePromptAddendum.d.ts.map