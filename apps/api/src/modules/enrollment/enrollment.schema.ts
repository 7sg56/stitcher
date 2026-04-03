import { z } from "zod/v4";

export const enrollSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
});

export type EnrollInput = z.infer<typeof enrollSchema>;

export const enrollByPasskeySchema = z.object({
    passkey: z.string().length(6, "Passkey must be 6 characters"),
});

export type EnrollByPasskeyInput = z.infer<typeof enrollByPasskeySchema>;

export const teacherManageSchema = z.object({
    user_id: z.string().uuid("Invalid user ID"),
    course_id: z.string().uuid("Invalid course ID"),
});

export type TeacherManageInput = z.infer<typeof teacherManageSchema>;

export const updateEnrollmentStatusSchema = z.object({
    status: z.enum(["active", "dropped", "completed"]),
});

export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusSchema>;
