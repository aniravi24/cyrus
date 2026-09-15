/**
 * Try to parse a buffered response body as a raw ScheduleWakeup tool-input
 * JSON (`{"delaySeconds": ..., "reason": ..., "prompt": ...}`). Returns null
 * when the content is anything else (real prose, other tools, invalid JSON).
 */
export function tryParseScheduleWakeupInput(content) {
    const trimmed = content.trim();
    if (!trimmed.startsWith("{"))
        return null;
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.delaySeconds !== "number")
            return null;
        return {
            delaySeconds: parsed.delaySeconds,
            ...(typeof parsed.reason === "string" && { reason: parsed.reason }),
            ...(typeof parsed.prompt === "string" && { prompt: parsed.prompt }),
        };
    }
    catch {
        return null;
    }
}
/**
 * Render a friendly Linear `response` body for a turn that ended on a
 * ScheduleWakeup call.
 */
export function formatScheduleWakeupResponse(input) {
    const lines = [
        `⏰ **Wakeup scheduled** — resuming in ${formatDuration(input.delaySeconds)}.`,
    ];
    if (input.reason) {
        lines.push("", `> ${input.reason}`);
    }
    return lines.join("\n");
}
/**
 * Render the `thought` body posted after the response, declaring everything
 * that will wake the session later. Returns null when nothing is pending so
 * callers can skip posting.
 */
export function formatPendingWorkThought(pendingWork) {
    const items = [
        ...pendingWork.sessionCrons.map(formatSessionCron),
        ...pendingWork.backgroundTasks.map(formatBackgroundTask),
    ];
    if (items.length === 0)
        return null;
    return [
        "⏳ Standing by — this session will wake automatically:",
        "",
        ...items.map((item) => `- ${item}`),
    ].join("\n");
}
function formatSessionCron(cron) {
    const when = cron.recurring
        ? `on schedule \`${cron.schedule}\``
        : describeOneShotCronTime(cron.schedule);
    const prompt = cron.prompt ? ` — "${truncate(cron.prompt, 140)}"` : "";
    return cron.recurring
        ? `🔁 Recurring wakeup ${when}${prompt}`
        : `⏰ Wakeup ${when}${prompt}`;
}
function formatBackgroundTask(task) {
    const label = task.type === "shell" ? "Background command" : task.type;
    const detail = task.command
        ? `\`${truncate(task.command, 100)}\``
        : truncate(task.description, 140);
    return `🛠️ ${capitalize(label)} (${task.status}): ${detail}`;
}
/**
 * One-shot ScheduleWakeup tasks encode their single fire time as a cron
 * expression ("27 12 * * *" = today at 12:27 local time). Render it as a
 * clock time when the expression has concrete minute/hour fields; fall back
 * to showing the raw expression otherwise.
 */
function describeOneShotCronTime(schedule) {
    const fields = schedule.trim().split(/\s+/);
    if (fields.length >= 2) {
        const minute = Number(fields[0]);
        const hour = Number(fields[1]);
        if (Number.isInteger(minute) &&
            Number.isInteger(hour) &&
            minute >= 0 &&
            minute <= 59 &&
            hour >= 0 &&
            hour <= 23) {
            return `at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        }
    }
    return `on schedule \`${schedule}\``;
}
function formatDuration(seconds) {
    if (seconds < 90)
        return `~${Math.round(seconds)}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 90)
        return `~${minutes}m`;
    return `~${Math.round(minutes / 60)}h`;
}
function truncate(text, max) {
    const collapsed = text.replace(/\s+/g, " ").trim();
    return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max)}…`;
}
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
//# sourceMappingURL=PendingWorkFormatter.js.map