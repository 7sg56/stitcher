import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { ReportsService } from "./reports.service";
import { submitReportSchema } from "./reports.schema";

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

// POST /reports
export async function submitReport(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const body = submitReportSchema.parse(req.body);
    const service = new ReportsService(req.server.supabase);

    try {
        const result = await service.submitReport(me.id, body);
        return reply.code(201).send({
            report: result,
            action: result.action_taken,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to submit report";
        return reply.code(400).send({ error: message });
    }
}

// GET /reports/course/:courseId
export async function getReportsByCourse(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Access denied" });
    }

    const service = new ReportsService(req.server.supabase);
    const reports = await service.getReportsByCourse(req.params.courseId);
    return reply.send({ reports });
}
