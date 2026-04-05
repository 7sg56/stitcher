import { z } from "zod/v4";

export const createCourseSchema = z.object({
    name: z.string().min(1, "Course name is required"),
    code: z.string().min(1, "Course code is required"),
    semester_number: z.number().int().min(1),
    department: z.string().optional(),
    teacher_id: z.string().uuid("Invalid teacher ID").optional(),
    class_name: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    semester_number: z.number().int().min(1).optional(),
    department: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    teacher_id: z.string().uuid().nullable().optional(),
    class_name: z.string().nullable().optional(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const createUnitSchema = z.object({
    unit_number: z.number().int().min(1),
    title: z.string().min(1, "Unit title is required"),
    description: z.string().optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const createExamSectionSchema = z.object({
    type: z.string().min(1, "Exam type is required"),
    year: z.number().int().min(2000),
    exam_board: z.string().optional(),
});

export type CreateExamSectionInput = z.infer<typeof createExamSectionSchema>;
