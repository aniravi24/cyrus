/**
 * ProcedureAnalyzer - Intelligent analysis of agent sessions to determine procedures
 *
 * Uses a SimpleAgentRunner (Claude or Gemini) to analyze requests and determine
 * which procedure (sequence of subroutines) should be executed.
 */
import type { CyrusAgentSession } from "cyrus-core";
import type { ProcedureAnalysisDecision, ProcedureDefinition, SubroutineDefinition } from "./types.js";
export type SimpleRunnerType = "claude" | "gemini";
export interface ProcedureAnalyzerConfig {
    cyrusHome: string;
    model?: string;
    timeoutMs?: number;
    runnerType?: SimpleRunnerType;
}
export declare class ProcedureAnalyzer {
    private analysisRunner;
    private procedures;
    constructor(config: ProcedureAnalyzerConfig);
    /**
     * Build the system prompt for request analysis and classification
     */
    private buildAnalysisSystemPrompt;
    /**
     * Load predefined procedures from registry
     */
    private loadPredefinedProcedures;
    /**
     * Analyze a request and determine which procedure to use
     */
    determineRoutine(requestText: string): Promise<ProcedureAnalysisDecision>;
    /**
     * Get the next subroutine for a session
     * Returns null if procedure is complete
     */
    getNextSubroutine(session: CyrusAgentSession): SubroutineDefinition | null;
    /**
     * Get the current subroutine for a session
     */
    getCurrentSubroutine(session: CyrusAgentSession): SubroutineDefinition | null;
    /**
     * Initialize procedure metadata for a new session
     */
    initializeProcedureMetadata(session: CyrusAgentSession, procedure: ProcedureDefinition): void;
    /**
     * Record subroutine completion and advance to next
     */
    advanceToNextSubroutine(session: CyrusAgentSession, sessionId: string | null): void;
    /**
     * Check if procedure is complete
     */
    isProcedureComplete(session: CyrusAgentSession): boolean;
    /**
     * Register a custom procedure
     */
    registerProcedure(procedure: ProcedureDefinition): void;
    /**
     * Get procedure by name
     */
    getProcedure(name: string): ProcedureDefinition | undefined;
}
//# sourceMappingURL=ProcedureAnalyzer.d.ts.map