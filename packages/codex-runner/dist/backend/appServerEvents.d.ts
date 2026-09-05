import type { NormalizedCodexItem } from "./types.js";
/** Notification method names emitted by the app-server that we act on. */
export type AppServerNotification = "turn/started" | "item/started" | "item/completed" | "turn/completed" | "thread/tokenUsage/updated" | (string & {});
/**
 * Translate an app-server v2 thread item into a {@link NormalizedCodexItem}.
 * Returns null for item types the activity mapper does not render.
 */
export declare function translateAppServerItem(raw: unknown): NormalizedCodexItem | null;
//# sourceMappingURL=appServerEvents.d.ts.map