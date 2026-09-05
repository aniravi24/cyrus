import readline from "node:readline";
/**
 * Utility namespace for CLI prompts and user interaction
 */
export var CLIPrompts;
(function (CLIPrompts) {
    /**
     * Ask a question and return the user's answer
     */
    async function ask(prompt) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }
    CLIPrompts.ask = ask;
    /**
     * Ask a yes/no question
     */
    async function confirm(prompt, defaultValue = false) {
        const suffix = defaultValue ? " (Y/n): " : " (y/N): ";
        const answer = await CLIPrompts.ask(prompt + suffix);
        if (!answer) {
            return defaultValue;
        }
        return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
    }
    CLIPrompts.confirm = confirm;
    /**
     * Display a menu and get user selection
     */
    async function menu(title, options) {
        console.log(`\n${title}`);
        console.log("─".repeat(50));
        options.forEach((option, index) => {
            console.log(`${index + 1}. ${option}`);
        });
        const answer = await CLIPrompts.ask("\nYour choice: ");
        const choice = parseInt(answer, 10);
        if (Number.isNaN(choice) || choice < 1 || choice > options.length) {
            return null;
        }
        return choice - 1;
    }
    CLIPrompts.menu = menu;
})(CLIPrompts || (CLIPrompts = {}));
//# sourceMappingURL=CLIPrompts.js.map