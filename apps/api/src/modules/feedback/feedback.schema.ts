import { z } from "zod/v4";

export const openFeedbackWindowSchema = z.object({
    session_id: z.string().uuid("Invalid session ID"),
    unit_id: z.string().uuid("Invalid unit ID").optional(),
});

export type OpenFeedbackWindowInput = z.infer<typeof openFeedbackWindowSchema>;

export const submitFeedbackSchema = z.object({
    session_id: z.string().uuid("Invalid session ID"),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
    is_anonymous: z.boolean().default(false),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
