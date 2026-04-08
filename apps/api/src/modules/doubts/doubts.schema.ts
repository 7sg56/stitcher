import { z } from "zod/v4";

export const createThreadSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
    title: z.string().min(1, "Thread title is required"),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const createMessageSchema = z.object({
    content: z.string().min(1, "Message content is required"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
