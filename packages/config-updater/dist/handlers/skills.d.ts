import type { ApiResponse, DeleteSkillPayload, UpdateSkillPayload } from "../types.js";
/**
 * Handle creating or updating a user skill.
 * Writes a SKILL.md file to ~/.cyrus/user-skills-plugin/skills/<name>/SKILL.md
 */
export declare function handleUpdateSkill(payload: UpdateSkillPayload, cyrusHome: string): Promise<ApiResponse>;
/**
 * Handle deleting a user skill.
 * Removes the skill directory from ~/.cyrus/user-skills-plugin/skills/<name>/
 */
export declare function handleDeleteSkill(payload: DeleteSkillPayload, cyrusHome: string): Promise<ApiResponse>;
/**
 * Handle listing all user skills.
 * Reads skill directories from ~/.cyrus/user-skills-plugin/skills/
 * and returns name + description from each SKILL.md frontmatter.
 */
export declare function handleListSkills(_payload: Record<string, never>, cyrusHome: string): Promise<ApiResponse>;
//# sourceMappingURL=skills.d.ts.map