import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { FeedbackService } from "./feedback.service";
import { openFeedbackWindowSchema, submitFeedbackSchema } from "./feedback.schema";

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

// POST /feedback/window -- teacher opens feedback window
export async function openFeedbackWindow(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can open feedback windows" });
    }

    const body = openFeedbackWindowSchema.parse(req.body);
    const service = new FeedbackService(req.server.supabase);

    try {
        const window = await service.openWindow(me.id, body);
        return reply.code(201).send({ window });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to open feedback window";
        return reply.code(400).send({ error: message });
    }
}

// PATCH /feedback/window/:id/close -- teacher closes feedback window
export async function closeFeedbackWindow(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can close feedback windows" });
    }

    const service = new FeedbackService(req.server.supabase);
    try {
        const window = await service.closeWindow(req.params.id);
        return reply.send({ window });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to close feedback window";
        return reply.code(400).send({ error: message });
    }
}

// GET /feedback/window/session/:sessionId -- check if feedback window is open
export async function getFeedbackWindow(
    req: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new FeedbackService(req.server.supabase);
    const window = await service.getWindowBySession(req.params.sessionId);
    return reply.send({ window });
}

// POST /feedback -- student submits feedback
export async function submitFeedback(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "student") {
        return reply.code(403).send({ error: "Only students can submit feedback" });
    }

    const body = submitFeedbackSchema.parse(req.body);
    const service = new FeedbackService(req.server.supabase);

    try {
        const feedback = await service.submitFeedback(
            me.id,
            body.session_id,
            body.rating,
            body.comment,
            body.is_anonymous
        );
        return reply.code(201).send({ feedback });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to submit feedback";
        return reply.code(400).send({ error: message });
    }
}

// GET /feedback/session/:sessionId -- teacher views feedback
export async function getFeedbackBySession(
    req: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new FeedbackService(req.server.supabase);
    const feedback = await service.getFeedbackBySession(req.params.sessionId);

    // If teacher, hide student identities for anonymous feedback
    const sanitized = feedback.map((f) => {
        if (f.is_anonymous && me.role.name !== "admin") {
            return { ...f, student_id: null };
        }
        return f;
    });

    return reply.send({ feedback: sanitized });
}

// GET /feedback/rating/:courseId -- get course average rating
export async function getCourseRating(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new FeedbackService(req.server.supabase);
    const rating = await service.getAverageRatingByCourse(req.params.courseId);
    return reply.send(rating);
}
