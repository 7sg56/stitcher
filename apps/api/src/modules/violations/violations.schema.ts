import { z } from "zod";

export const logViolationSchema = z.object({
    user_id: z.string().uuid(),
    course_id: z.string().uuid(),
    type: z.string().min(1),
    severity: z.number().int().min(1).max(5).optional(),
    content_ref: z.string().optional(),
});

export type LogViolationInput = z.infer<typeof logViolationSchema>;
