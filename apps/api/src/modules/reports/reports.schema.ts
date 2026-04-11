import { z } from "zod";

export const submitReportSchema = z.object({
    course_id: z.string().uuid(),
    content_type: z.enum(["thread", "message"]),
    content_id: z.string().uuid(),
    reason: z.string().max(500).optional(),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
