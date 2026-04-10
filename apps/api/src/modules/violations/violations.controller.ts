import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { ViolationsService } from "./violations.service";

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

// GET /violations/course/:courseId
export async function getViolationsByCourse(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Access denied" });
    }

    const service = new ViolationsService(req.server.supabase);
    const violations = await service.getViolationsByCourse(req.params.courseId);
    return reply.send({ violations });
}

// GET /violations/user/:userId
export async function getViolationsByUser(
    req: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "admin") {
        return reply.code(403).send({ error: "Admin access required" });
    }

    const service = new ViolationsService(req.server.supabase);
    const violations = await service.getViolationsByUser(req.params.userId);
    return reply.send({ violations });
}

// GET /violations/my/:courseId -- student's own violations for a course
export async function getMyViolations(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new ViolationsService(req.server.supabase);
    const violations = await service.getViolationsByUser(me.id, req.params.courseId);
    return reply.send({ violations, count: violations.length });
}
