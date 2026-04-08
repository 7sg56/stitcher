import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { SessionsService } from "./sessions.service";
import { createSessionSchema } from "./sessions.schema";

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

// POST /sessions -- start a new session
export async function startSession(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can start sessions" });
    }

    const body = createSessionSchema.parse(req.body);
    const service = new SessionsService(req.server.supabase);

    // Verify teacher owns this course
    if (me.role.name === "teacher") {
        const { data: course } = await req.server.supabase
            .from("courses")
            .select("teacher_id")
            .eq("id", body.course_id)
            .single();

        if (!course || course.teacher_id !== me.id) {
            return reply.code(403).send({ error: "You can only start sessions for your own courses" });
        }
    }

    try {
        const session = await service.startSession(me.id, body);
        return reply.code(201).send({ session });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to start session";
        return reply.code(400).send({ error: message });
    }
}

// GET /sessions/course/:courseId -- list sessions for a course
export async function listSessions(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new SessionsService(req.server.supabase);
    const sessions = await service.listSessionsByCourse(req.params.courseId);
    return reply.send({ sessions });
}

// GET /sessions/:id -- get session detail
export async function getSession(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new SessionsService(req.server.supabase);
    const session = await service.getSessionById(req.params.id);

    if (!session) {
        return reply.code(404).send({ error: "Session not found" });
    }

    return reply.send({ session });
}

// GET /sessions/active/:courseId -- get active session for a course
export async function getActiveSession(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new SessionsService(req.server.supabase);
    const session = await service.getActiveSession(req.params.courseId);
    return reply.send({ session });
}

// PATCH /sessions/:id/end -- end a session
export async function endSession(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can end sessions" });
    }

    const service = new SessionsService(req.server.supabase);

    try {
        const session = await service.endSession(req.params.id);
        return reply.send({ session });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to end session";
        return reply.code(400).send({ error: message });
    }
}

// PATCH /sessions/:id/cancel -- cancel a session
export async function cancelSession(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can cancel sessions" });
    }

    const service = new SessionsService(req.server.supabase);

    try {
        const session = await service.cancelSession(req.params.id);
        return reply.send({ session });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to cancel session";
        return reply.code(400).send({ error: message });
    }
}
