import { z } from "zod";

// No input schemas needed yet -- dashboard endpoints are query-only
// Keeping this file as a placeholder for future validation

export const dashboardParamsSchema = z.object({
    courseId: z.string().uuid().optional(),
});
