import { z } from "zod/v4";

export const createSubjectSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
    name: z.string().min(1, "Subject name is required"),
    code: z.string().min(1, "Subject code is required"),
    unit_count: z.number().int().min(0).default(0),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const createUnitSchema = z.object({
    unit_number: z.number().int().min(1, "Unit number must be at least 1"),
    title: z.string().min(1, "Unit title is required"),
    description: z.string().optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const createExamSectionSchema = z.object({
    type: z.string().min(1, "Exam type is required"),
    year: z.number().int().min(2000, "Year must be 2000 or later"),
    exam_board: z.string().optional(),
});

export type CreateExamSectionInput = z.infer<typeof createExamSectionSchema>;
