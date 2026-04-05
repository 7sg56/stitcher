import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { CoursesService } from "./courses.service";
import { createCourseSchema, updateCourseSchema, createUnitSchema, createExamSectionSchema } from "./courses.schema";

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

// POST /courses
export async function createCourse(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can create courses" });
    }

    const body = createCourseSchema.parse(req.body);
    const service = new CoursesService(req.server.supabase);

    if (me.role.name === "admin") {
        if (!body.teacher_id) {
            return reply.code(400).send({ error: "Admins must explicitly assign a teacher when creating a course" });
        }
        if (body.teacher_id === me.id) {
            return reply.code(400).send({ error: "Admins cannot self-assign courses" });
        }
    }

    // if teacher, auto-fallback to self if teacher_id not provided
    try {
        const course = await service.createCourse(
            body,
            me.role.name === "teacher" ? me.id : undefined
        );
        return reply.code(201).send({ course });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create course";
        return reply.code(400).send({ error: message });
    }
}

// GET /courses
export async function listCourses(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new CoursesService(req.server.supabase);
    const activeOnly = me.role.name === "student";
    const courses = await service.listCourses(activeOnly);

    // Hide passkey from students
    const sanitized = courses.map((c) => {
        if (me.role.name === "student") {
            const { passkey: _p, ...rest } = c;
            return rest;
        }
        return c;
    });

    return reply.send({ courses: sanitized });
}

// GET /courses/:id
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

    if (me.role.name === "student" && !course.is_active) {
        return reply.code(404).send({ error: "Course not found" });
    }

    if (me.role.name === "student") {
        const { passkey: _p, ...rest } = course;
        return reply.send({ course: rest });
    }

    return reply.send({ course });
}

// PATCH /courses/:id
export async function updateCourse(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can update courses" });
    }

    if (me.role.name === "teacher") {
        const service = new CoursesService(req.server.supabase);
        const existing = await service.getCourseById(req.params.id);
        if (!existing || existing.teacher_id !== me.id) {
            return reply.code(403).send({ error: "You can only edit your own courses" });
        }
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

// DELETE /courses/:id
export async function deleteCourse(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can delete courses" });
    }

    if (me.role.name === "teacher") {
        const service = new CoursesService(req.server.supabase);
        const existing = await service.getCourseById(req.params.id);
        if (!existing || existing.teacher_id !== me.id) {
            return reply.code(403).send({ error: "You can only delete your own courses" });
        }
    }

    const service = new CoursesService(req.server.supabase);
    try {
        await service.deleteCourse(req.params.id);
        return reply.send({ message: "Course deleted" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete course";
        return reply.code(400).send({ error: message });
    }
}

// PATCH /courses/:id/toggle
export async function toggleCourseActive(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can toggle course status" });
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

// PATCH /courses/:id/passkey
export async function regeneratePasskey(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can regenerate passkeys" });
    }

    const service = new CoursesService(req.server.supabase);
    try {
        const course = await service.regeneratePasskey(req.params.id);
        return reply.send({ course });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to regenerate passkey";
        return reply.code(400).send({ error: message });
    }
}

// POST /courses/:id/units
export async function addUnit(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can add units" });
    }

    const body = createUnitSchema.parse(req.body);
    const service = new CoursesService(req.server.supabase);

    try {
        const unit = await service.addUnit(req.params.id, body);
        return reply.code(201).send({ unit });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add unit";
        return reply.code(400).send({ error: message });
    }
}

// DELETE /courses/:id/units/:unitId
export async function deleteUnit(
    req: FastifyRequest<{ Params: { id: string; unitId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can delete units" });
    }

    const service = new CoursesService(req.server.supabase);
    try {
        await service.deleteUnit(req.params.unitId);
        return reply.send({ message: "Unit deleted" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete unit";
        return reply.code(400).send({ error: message });
    }
}

// POST /courses/:id/exam-sections
export async function addExamSection(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can add exam sections" });
    }

    const body = createExamSectionSchema.parse(req.body);
    const service = new CoursesService(req.server.supabase);

    try {
        const section = await service.addExamSection(req.params.id, body);
        return reply.code(201).send({ exam_section: section });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add exam section";
        return reply.code(400).send({ error: message });
    }
}

// DELETE /courses/:id/exam-sections/:sectionId
export async function deleteExamSection(
    req: FastifyRequest<{ Params: { id: string; sectionId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can delete exam sections" });
    }

    const service = new CoursesService(req.server.supabase);
    try {
        await service.deleteExamSection(req.params.sectionId);
        return reply.send({ message: "Exam section deleted" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete exam section";
        return reply.code(400).send({ error: message });
    }
}
