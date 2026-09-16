/**
 * Utility namespace for CLI prompts and user interaction
 */
export declare namespace CLIPrompts {
    /**
     * Ask a question and return the user's answer
     */
    function ask(prompt: string): Promise<string>;
    /**
     * Ask a yes/no question
     */
    function confirm(prompt: string, defaultValue?: boolean): Promise<boolean>;
    /**
     * Display a menu and get user selection
     */
    function menu(title: string, options: string[]): Promise<number | null>;
}
//# sourceMappingURL=CLIPrompts.d.ts.map