import { BaseCommand } from "./ICommand.js";
/**
 * Detect the default branch of a cloned repository by reading the remote HEAD ref.
 * Falls back to DEFAULT_BASE_BRANCH ("main") if detection fails.
 */
export declare function detectDefaultBranch(repositoryPath: string): string;
/**
 * Self-add-repo command - clones a repo and adds it to config.json
 *
 * Usage:
 *   cyrus self-add-repo                      # prompts for everything
 *   cyrus self-add-repo <url>                # prompts for workspace if multiple
 *   cyrus self-add-repo <url> <workspace>    # no prompts
 *   cyrus self-add-repo <url> -l <labels>    # custom routing labels (comma-separated)
 *   cyrus self-add-repo <url> <workspace> -l <labels>
 *
 * Routing labels are used to route Linear issues to this repository.
 * If not specified, defaults to the repository name.
 */
export declare class SelfAddRepoCommand extends BaseCommand {
    private rl;
    private getReadline;
    private prompt;
    private cleanup;
    execute(args: string[]): Promise<void>;
}
//# sourceMappingURL=SelfAddRepoCommand.d.ts.map