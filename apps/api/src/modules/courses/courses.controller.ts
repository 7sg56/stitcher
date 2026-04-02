import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { CoursesService } from "./courses.service";
import { createCourseSchema, updateCourseSchema } from "./courses.schema";

// Helper to get the current user with role
async function getCurrentUser(req: FastifyRequest, reply: FastifyReply) {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) {
        reply.code(401).send({ error: "Not authenticated" });
        return null;
    }

    const authService = new AuthService(req.server.supabase);
    const user = await authService.getUserByClerkId(clerkId);
    if (!user) {
        reply.code(404).send({ error: "User not found" });
        return null;
    }

    return user;
}

// POST /courses -- create a course (teacher/admin only)
export async function createCourse(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can create courses" });
    }

    const body = createCourseSchema.parse(req.body);
    const service = new CoursesService(req.server.supabase);

    try {
        const course = await service.createCourse(body);
        return reply.code(201).send({ course });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create course";
        return reply.code(400).send({ error: message });
    }
}

// GET /courses -- list courses
export async function listCourses(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new CoursesService(req.server.supabase);
    // Students only see active courses
    const activeOnly = me.role.name === "student";
    const courses = await service.listCourses(activeOnly);

    return reply.send({ courses });
}

// GET /courses/:id -- get course detail with subjects
export async function getCourse(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new CoursesService(req.server.supabase);
    const course = await service.getCourseById(req.params.id);

    if (!course) {
        return reply.code(404).send({ error: "Course not found" });
    }

    // Students cannot view inactive courses
    if (me.role.name === "student" && !course.is_active) {
        return reply.code(404).send({ error: "Course not found" });
    }

    return reply.send({ course });
}

// PATCH /courses/:id -- update a course (teacher/admin only)
export async function updateCourse(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can update courses" });
    }

    const body = updateCourseSchema.parse(req.body);
    const service = new CoursesService(req.server.supabase);

    try {
        const course = await service.updateCourse(req.params.id, body);
        return reply.send({ course });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update course";
        return reply.code(400).send({ error: message });
    }
}

// PATCH /courses/:id/toggle -- toggle course active status (admin only)
export async function toggleCourseActive(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "admin") {
        return reply.code(403).send({ error: "Only admins can toggle course status" });
    }

    const service = new CoursesService(req.server.supabase);

    try {
        const course = await service.toggleActive(req.params.id);
        return reply.send({ course });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to toggle course status";
        return reply.code(400).send({ error: message });
    }
}
