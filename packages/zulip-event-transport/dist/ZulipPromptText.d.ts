/**
 * Turning a Zulip message into the text handed to the agent.
 *
 * Deliberately not an `IMessageTranslator`: the Slack transport also emits
 * `InternalMessage`s onto the internal message bus, but every bus handler for
 * chat events in EdgeWorker is still a logging placeholder, so a Zulip
 * translator would add core platform-data types and a `source` union member
 * without anything consuming them. When the bus migration lands, Zulip can
 * join it then.
 */
/**
 * Strip a leading @mention of the bot from the message text.
 *
 * Only the leading mention goes: a mention of someone else mid-sentence is
 * part of what the user actually said.
 */
export declare function stripMention(text: string): string;
/**
 * The prompt text for a Zulip message — the user's own words, with the
 * mention that summoned Cyrus removed.
 */
export declare function buildPromptText(content: string): string;
//# sourceMappingURL=ZulipPromptText.d.ts.map