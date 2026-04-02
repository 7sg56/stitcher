import { z } from "zod/v4";

export const createCourseSchema = z.object({
    name: z.string().min(1, "Course name is required"),
    code: z.string().min(1, "Course code is required"),
    semester_number: z.number().int().min(1, "Semester must be at least 1"),
    department: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    semester_number: z.number().int().min(1).optional(),
    department: z.string().optional(),
    is_active: z.boolean().optional(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
