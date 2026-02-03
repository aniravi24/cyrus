import { BaseCommand } from "./ICommand.js";
/**
 * Self-add-repo command - clones a repo and adds it to config.json
 *
 * Usage:
 *   cyrus self-add-repo                      # prompts for everything
 *   cyrus self-add-repo <url>                # prompts for workspace if multiple
 *   cyrus self-add-repo <url> <workspace>    # no prompts
 */
export declare class SelfAddRepoCommand extends BaseCommand {
    private rl;
    private getReadline;
    private prompt;
    private cleanup;
    execute(args: string[]): Promise<void>;
}
//# sourceMappingURL=SelfAddRepoCommand.d.ts.map