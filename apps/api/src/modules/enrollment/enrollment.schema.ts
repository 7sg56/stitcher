import { z } from "zod/v4";

export const enrollSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
});

export type EnrollInput = z.infer<typeof enrollSchema>;

export const updateEnrollmentStatusSchema = z.object({
    status: z.enum(["active", "dropped", "completed"]),
});

export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusSchema>;
