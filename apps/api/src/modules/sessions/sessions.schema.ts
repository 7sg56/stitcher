import { z } from "zod/v4";

export const createSessionSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
    topic: z.string().optional(),
    location: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
    topic: z.string().optional(),
    location: z.string().optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
