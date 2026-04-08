import { z } from "zod/v4";

export const createResourceSchema = z.object({
    course_id: z.string().uuid("Invalid course ID"),
    unit_id: z.string().uuid("Invalid unit ID").optional(),
    exam_section_id: z.string().uuid("Invalid exam section ID").optional(),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    file_url: z.string().min(1, "File URL is required"),
    file_name: z.string().min(1, "File name is required"),
    file_size: z.number().int().optional(),
    mime_type: z.string().optional(),
}).refine(
    (data) => {
        const set = [data.unit_id, data.exam_section_id].filter(Boolean);
        return set.length === 1;
    },
    { message: "Resource must belong to exactly one of: unit or exam_section" }
);

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
