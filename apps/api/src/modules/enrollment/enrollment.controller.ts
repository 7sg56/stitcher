import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { EnrollmentService } from "./enrollment.service";
import { enrollSchema } from "./enrollment.schema";

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

// POST /enrollment -- enroll current student in a course
export async function enrollInCourse(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "student") {
        return reply.code(403).send({ error: "Only students can enroll in courses" });
    }

    const body = enrollSchema.parse(req.body);
    const service = new EnrollmentService(req.server.supabase);

    try {
        const enrollment = await service.enrollStudent(me.id, body.course_id);
        return reply.code(201).send({ enrollment });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to enroll";
        return reply.code(400).send({ error: message });
    }
}

// DELETE /enrollment/:id -- drop an enrollment
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

// GET /enrollment/my -- get current student's enrollments
export async function getMyEnrollments(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new EnrollmentService(req.server.supabase);
    const enrollments = await service.getMyEnrollments(me.id);

    return reply.send({ enrollments });
}

// GET /enrollment/course/:courseId -- list enrollments for a course (teacher/admin only)
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
