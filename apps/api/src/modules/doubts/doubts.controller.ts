import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { DoubtsService } from "./doubts.service";
import { createThreadSchema, createMessageSchema } from "./doubts.schema";

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

// Verify user is enrolled in or teaches the course
async function verifyCourseMembership(
    supabase: FastifyRequest["server"]["supabase"],
    userId: string,
    courseId: string,
    roleName: string
): Promise<boolean> {
    if (roleName === "admin") return true;

    if (roleName === "teacher") {
        const { data: course } = await supabase
            .from("courses")
            .select("teacher_id")
            .eq("id", courseId)
            .single();
        return course?.teacher_id === userId;
    }

    // Student: check enrollment
    const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .eq("status", "active")
        .single();

    return !!enrollment;
}

// POST /doubts/threads
export async function createThread(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const body = createThreadSchema.parse(req.body);

    // Verify membership
    const isMember = await verifyCourseMembership(req.server.supabase, me.id, body.course_id, me.role.name);
    if (!isMember) {
        return reply.code(403).send({ error: "You must be enrolled in or teach this course" });
    }

    const service = new DoubtsService(req.server.supabase);
    try {
        const thread = await service.createThread(body.course_id, me.id, body.title);
        return reply.code(201).send({ thread });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create thread";
        return reply.code(400).send({ error: message });
    }
}

// GET /doubts/threads/course/:courseId
export async function listThreads(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const isMember = await verifyCourseMembership(req.server.supabase, me.id, req.params.courseId, me.role.name);
    if (!isMember) {
        return reply.code(403).send({ error: "You must be enrolled in or teach this course" });
    }

    const service = new DoubtsService(req.server.supabase);
    const threads = await service.listThreadsByCourse(req.params.courseId, me.id);
    return reply.send({ threads });
}

// GET /doubts/threads/:id
export async function getThread(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new DoubtsService(req.server.supabase);
    const thread = await service.getThreadWithMessages(req.params.id, me.role.name, me.id);

    if (!thread) {
        return reply.code(404).send({ error: "Thread not found" });
    }

    // Verify membership
    const isMember = await verifyCourseMembership(req.server.supabase, me.id, thread.course_id, me.role.name);
    if (!isMember) {
        return reply.code(403).send({ error: "You must be enrolled in or teach this course" });
    }

    return reply.send({ thread });
}

// POST /doubts/threads/:id/messages
export async function addMessage(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const body = createMessageSchema.parse(req.body);

    // Get thread to verify course membership
    const { data: thread } = await req.server.supabase
        .from("doubt_threads")
        .select("course_id")
        .eq("id", req.params.id)
        .single();

    if (!thread) {
        return reply.code(404).send({ error: "Thread not found" });
    }

    const isMember = await verifyCourseMembership(req.server.supabase, me.id, thread.course_id, me.role.name);
    if (!isMember) {
        return reply.code(403).send({ error: "You must be enrolled in or teach this course" });
    }

    const service = new DoubtsService(req.server.supabase);
    try {
        const message = await service.addMessage(req.params.id, me.id, body.content);
        return reply.code(201).send({ message });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send message";
        return reply.code(400).send({ error: message });
    }
}

// PATCH /doubts/threads/:id/resolve
export async function resolveThread(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can resolve threads" });
    }

    const service = new DoubtsService(req.server.supabase);
    try {
        const thread = await service.resolveThread(req.params.id);
        return reply.send({ thread });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to resolve thread";
        return reply.code(400).send({ error: message });
    }
}

// POST /doubts/threads/:id/upvote
export async function toggleThreadUpvote(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new DoubtsService(req.server.supabase);
    try {
        const newCount = await service.upvoteThread(req.params.id, me.id);
        return reply.send({ upvote_count: newCount });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to upvote thread";
        return reply.code(400).send({ error: message });
    }
}

// POST /doubts/messages/:id/upvote
export async function toggleMessageUpvote(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new DoubtsService(req.server.supabase);
    try {
        const newCount = await service.upvoteMessage(req.params.id, me.id);
        return reply.send({ upvote_count: newCount });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to upvote message";
        return reply.code(400).send({ error: message });
    }
}
