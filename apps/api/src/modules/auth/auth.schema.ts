import { z } from "zod/v4";

export const syncUserSchema = z.object({
    real_name: z.string().optional(),
    real_email: z.email().optional(),
    real_phone: z.string().optional(),
});

export type SyncUserInput = z.infer<typeof syncUserSchema>;
