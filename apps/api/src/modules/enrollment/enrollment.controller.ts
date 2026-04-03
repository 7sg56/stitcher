import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { EnrollmentService } from "./enrollment.service";
import { enrollByPasskeySchema, teacherManageSchema } from "./enrollment.schema";

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

// POST /enrollment/passkey -- student enrolls via passkey
export async function enrollByPasskey(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "student") {
        return reply.code(403).send({ error: "Only students can enroll via passkey" });
    }

    const body = enrollByPasskeySchema.parse(req.body);
    const service = new EnrollmentService(req.server.supabase);

    try {
        const enrollment = await service.enrollByPasskey(me.id, body.passkey);
        return reply.code(201).send({ enrollment });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to enroll";
        return reply.code(400).send({ error: message });
    }
}

// POST /enrollment/manage -- teacher adds a student
export async function teacherAddStudent(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can manage enrollments" });
    }

    const body = teacherManageSchema.parse(req.body);
    const service = new EnrollmentService(req.server.supabase);

    try {
        const enrollment = await service.enrollStudent(body.user_id, body.course_id);
        return reply.code(201).send({ enrollment });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add student";
        return reply.code(400).send({ error: message });
    }
}

// DELETE /enrollment/manage/:id -- teacher removes a student
export async function teacherRemoveStudent(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can remove students" });
    }

    const service = new EnrollmentService(req.server.supabase);
    try {
        await service.removeStudent(req.params.id);
        return reply.send({ message: "Student removed from course" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to remove student";
        return reply.code(400).send({ error: message });
    }
}

// DELETE /enrollment/:id -- student drops enrollment
export async function dropEnrollment(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new EnrollmentService(req.server.supabase);
    try {
        const enrollment = await service.dropEnrollment(req.params.id, me.id);
        return reply.send({ enrollment, message: "Enrollment dropped" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to drop enrollment";
        return reply.code(400).send({ error: message });
    }
}

// GET /enrollment/my
export async function getMyEnrollments(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new EnrollmentService(req.server.supabase);
    const enrollments = await service.getMyEnrollments(me.id);

    return reply.send({ enrollments });
}

// GET /enrollment/course/:courseId -- list enrolled students (teacher/admin)
export async function getEnrollmentsByCourse(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can view course enrollments" });
    }

    const service = new EnrollmentService(req.server.supabase);
    const enrollments = await service.getEnrollmentsByCourse(req.params.courseId);

    return reply.send({ enrollments });
}
