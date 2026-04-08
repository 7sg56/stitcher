import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { AttendanceService } from "./attendance.service";
import { markAttendanceSchema, bulkMarkAttendanceSchema } from "./attendance.schema";

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

// POST /attendance/mark
export async function markAttendance(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can mark attendance" });
    }

    const body = markAttendanceSchema.parse(req.body);
    const service = new AttendanceService(req.server.supabase);

    try {
        const record = await service.markAttendance(body.session_id, body.student_id, body.status);
        return reply.code(201).send({ attendance: record });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to mark attendance";
        return reply.code(400).send({ error: message });
    }
}

// POST /attendance/bulk
export async function bulkMarkAttendance(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can mark attendance" });
    }

    const body = bulkMarkAttendanceSchema.parse(req.body);
    const service = new AttendanceService(req.server.supabase);

    try {
        const records = await service.bulkMarkAttendance(body.session_id, body.records);
        return reply.send({ attendance: records });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to bulk mark attendance";
        return reply.code(400).send({ error: message });
    }
}

// GET /attendance/session/:sessionId
export async function getAttendanceBySession(
    req: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new AttendanceService(req.server.supabase);
    const records = await service.getAttendanceBySession(req.params.sessionId);
    return reply.send({ attendance: records });
}

// GET /attendance/student/:courseId
export async function getStudentAttendance(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "student") {
        return reply.code(403).send({ error: "This endpoint is for students only" });
    }

    const service = new AttendanceService(req.server.supabase);
    const records = await service.getAttendanceByStudent(me.id, req.params.courseId);
    return reply.send({ attendance: records });
}
