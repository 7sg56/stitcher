import { z } from "zod/v4";

export const createQuizSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
    unit_id: z.string().uuid("Invalid unit ID").optional(),
    title: z.string().min(1, "Quiz title is required"),
    description: z.string().optional(),
    duration_mins: z.number().int().min(1).optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const addQuestionSchema = z.object({
    question_text: z.string().min(1, "Question text is required"),
    question_type: z.enum(["mcq", "true_false", "short_answer"]).default("mcq"),
    points: z.number().int().min(1).default(1),
    order_index: z.number().int().default(0),
    options: z.array(z.object({
        option_text: z.string().min(1),
        is_correct: z.boolean().default(false),
        order_index: z.number().int().default(0),
    })).optional(),
});

export type AddQuestionInput = z.infer<typeof addQuestionSchema>;

export const submitResponseSchema = z.object({
    question_id: z.string().uuid("Invalid question ID"),
    selected_option_id: z.string().uuid("Invalid option ID").optional(),
    text_answer: z.string().optional(),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

export const submitAttemptSchema = z.object({
    responses: z.array(submitResponseSchema).min(1, "At least one response is required"),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
