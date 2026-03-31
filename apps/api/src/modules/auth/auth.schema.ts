import { z } from "zod/v4";

export const syncUserSchema = z.object({
    real_name: z.string().optional(),
    real_email: z.email().optional(),
    real_phone: z.string().optional(),
});

export type SyncUserInput = z.infer<typeof syncUserSchema>;

export const onboardUserSchema = z.object({
    real_name: z.string().min(1, "Name is required"),
    real_phone: z.string().min(10, "Phone must be at least 10 digits"),
});

export type OnboardUserInput = z.infer<typeof onboardUserSchema>;
