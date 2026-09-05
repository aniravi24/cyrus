/**
 * Terminate Issue command - move an issue to a terminal state (completed /
 * canceled / deleted) and emit an IssueStateChangeMessage on the unified
 * message bus, so EdgeWorker runs its terminal-state cleanup (stops sessions,
 * runs cyrus-teardown.sh in each repo's worktree, removes worktrees).
 */
import { Command } from "commander";
export declare function createTerminateIssueCommand(): Command;
//# sourceMappingURL=terminateIssue.d.ts.map