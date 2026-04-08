import { z } from "zod/v4";

export const markAttendanceSchema = z.object({
    session_id: z.string().uuid("Invalid session ID"),
    student_id: z.string().uuid("Invalid student ID"),
    status: z.enum(["present", "absent"]),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const bulkMarkAttendanceSchema = z.object({
    session_id: z.string().uuid("Invalid session ID"),
    records: z.array(z.object({
        student_id: z.string().uuid("Invalid student ID"),
        status: z.enum(["present", "absent"]),
    })).min(1, "At least one record is required"),
});

export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;
