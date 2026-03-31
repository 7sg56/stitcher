import { z } from "zod/v4";

export const updateRoleSchema = z.object({
    role: z.enum(["student", "teacher", "admin"]),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const toggleShadowBanSchema = z.object({
    is_shadow_banned: z.boolean(),
});

export type ToggleShadowBanInput = z.infer<typeof toggleShadowBanSchema>;
