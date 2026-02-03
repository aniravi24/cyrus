/**
 * Registry of predefined procedures and analysis rules
 */
import type { ProcedureDefinition, RequestClassification } from "./types.js";
/**
 * Predefined subroutine definitions
 */
export declare const SUBROUTINES: {
    readonly primary: {
        readonly name: "primary";
        readonly promptPath: "primary";
        readonly description: "Main work execution phase";
    };
    readonly debuggerReproduction: {
        readonly name: "debugger-reproduction";
        readonly promptPath: "subroutines/debugger-reproduction.md";
        readonly description: "Reproduce bug and perform root cause analysis";
    };
    readonly getApproval: {
        readonly name: "get-approval";
        readonly promptPath: "subroutines/get-approval.md";
        readonly description: "Request user approval before proceeding";
        readonly singleTurn: true;
        readonly requiresApproval: true;
    };
    readonly debuggerFix: {
        readonly name: "debugger-fix";
        readonly promptPath: "subroutines/debugger-fix.md";
        readonly description: "Implement minimal fix based on approved reproduction";
    };
    readonly verifications: {
        readonly name: "verifications";
        readonly promptPath: "subroutines/verifications.md";
        readonly description: "Run tests, linting, and type checking";
        readonly usesValidationLoop: true;
    };
    readonly validationFixer: {
        readonly name: "validation-fixer";
        readonly promptPath: "subroutines/validation-fixer.md";
        readonly description: "Fix validation failures from the verifications subroutine";
    };
    readonly gitCommit: {
        readonly name: "git-commit";
        readonly promptPath: "subroutines/git-commit.md";
        readonly description: "Stage, commit, and push changes to remote";
    };
    readonly ghPr: {
        readonly name: "gh-pr";
        readonly promptPath: "subroutines/gh-pr.md";
        readonly description: "Create or update GitHub Pull Request";
    };
    readonly changelogUpdate: {
        readonly name: "changelog-update";
        readonly promptPath: "subroutines/changelog-update.md";
        readonly description: "Update changelog (only if changelog files exist)";
    };
    readonly conciseSummary: {
        readonly name: "concise-summary";
        readonly promptPath: "subroutines/concise-summary.md";
        readonly singleTurn: true;
        readonly description: "Brief summary for simple requests";
        readonly suppressThoughtPosting: true;
        readonly disallowAllTools: true;
    };
    readonly verboseSummary: {
        readonly name: "verbose-summary";
        readonly promptPath: "subroutines/verbose-summary.md";
        readonly singleTurn: true;
        readonly description: "Detailed summary with implementation details";
        readonly suppressThoughtPosting: true;
        readonly disallowAllTools: true;
    };
    readonly questionInvestigation: {
        readonly name: "question-investigation";
        readonly promptPath: "subroutines/question-investigation.md";
        readonly description: "Gather information needed to answer a question";
    };
    readonly questionAnswer: {
        readonly name: "question-answer";
        readonly promptPath: "subroutines/question-answer.md";
        readonly singleTurn: true;
        readonly description: "Format final answer to user question";
        readonly suppressThoughtPosting: true;
        readonly disallowAllTools: true;
    };
    readonly codingActivity: {
        readonly name: "coding-activity";
        readonly promptPath: "subroutines/coding-activity.md";
        readonly description: "Implementation phase for code changes (no git/gh operations)";
    };
    readonly preparation: {
        readonly name: "preparation";
        readonly promptPath: "subroutines/preparation.md";
        readonly description: "Analyze request to determine if clarification or planning is needed";
    };
    readonly planSummary: {
        readonly name: "plan-summary";
        readonly promptPath: "subroutines/plan-summary.md";
        readonly singleTurn: true;
        readonly description: "Present clarifying questions or implementation plan";
        readonly suppressThoughtPosting: true;
        readonly disallowAllTools: true;
    };
    readonly userTesting: {
        readonly name: "user-testing";
        readonly promptPath: "subroutines/user-testing.md";
        readonly description: "Perform testing as requested by the user";
    };
    readonly userTestingSummary: {
        readonly name: "user-testing-summary";
        readonly promptPath: "subroutines/user-testing-summary.md";
        readonly singleTurn: true;
        readonly description: "Summary of user testing session results";
        readonly suppressThoughtPosting: true;
        readonly disallowAllTools: true;
    };
    readonly releaseExecution: {
        readonly name: "release-execution";
        readonly promptPath: "subroutines/release-execution.md";
        readonly description: "Execute release process using project skill or gather release info via AskUserQuestion";
    };
    readonly releaseSummary: {
        readonly name: "release-summary";
        readonly promptPath: "subroutines/release-summary.md";
        readonly singleTurn: true;
        readonly description: "Summary of the release process";
        readonly suppressThoughtPosting: true;
        readonly disallowAllTools: true;
    };
};
/**
 * Predefined procedure definitions
 */
export declare const PROCEDURES: Record<string, ProcedureDefinition>;
/**
 * Mapping from request classification to procedure name
 */
export declare const CLASSIFICATION_TO_PROCEDURE: Record<RequestClassification, string>;
/**
 * Get a procedure definition by name
 */
export declare function getProcedure(name: string): ProcedureDefinition | undefined;
/**
 * Get procedure name for a given classification
 */
export declare function getProcedureForClassification(classification: RequestClassification): string;
/**
 * Get all available procedure names
 */
export declare function getAllProcedureNames(): string[];
//# sourceMappingURL=registry.d.ts.map