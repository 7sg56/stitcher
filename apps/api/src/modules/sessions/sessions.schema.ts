import { z } from "zod/v4";

export const createSessionSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
    topic: z.string().optional(),
    location: z.string().optional(),
    duration_minutes: z.number().int().min(1).default(60),
    quiz_id: z.string().uuid().optional().nullable(),
    questions: z.array(z.object({
        question_text: z.string(),
        options: z.array(z.string())
    })).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
    topic: z.string().optional(),
    location: z.string().optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
