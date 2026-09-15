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
/**
 * GitHub installation tokens push payload schema.
 * Sent by cyrus-hosted with one short-lived GitHub App installation token
 * per installation (org or user account) the team has attached.
 */
export const GitHubTokensPayloadSchema = z.object({
    tokens: z.array(z.object({
        installationId: z.string().min(1),
        organization: z.string().nullable().optional().default(null),
        accountType: z
            .enum(["Organization", "User"])
            .nullable()
            .optional()
            .default(null),
        token: z.string().min(1),
        expiresAt: z.string().min(1),
    })),
});
//# sourceMappingURL=types.js.map