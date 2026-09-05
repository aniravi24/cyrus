import { EdgeConfigPayloadSchema } from "cyrus-core";
import { z } from "zod";
/**
 * Cyrus config update payload schema
 * Extends EdgeConfigPayloadSchema with operation flags for the update process.
 * Uses EdgeConfigPayloadSchema (not EdgeConfigSchema) because incoming payloads
 * may omit workspaceBaseDir - the handler applies a default value.
 */
export const CyrusConfigPayloadSchema = EdgeConfigPayloadSchema.extend({
    restartCyrus: z.boolean().optional(),
    backupConfig: z.boolean().optional(),
});
//# sourceMappingURL=types.js.map