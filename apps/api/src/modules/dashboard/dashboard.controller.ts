import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { DashboardService } from "./dashboard.service";

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

// GET /dashboard/student
export async function getStudentDashboard(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "student") {
        return reply.code(403).send({ error: "Student access only" });
    }

    const service = new DashboardService(req.server.supabase);
    const dashboard = await service.getStudentDashboard(me.id);
    return reply.send({ dashboard });
}

// GET /dashboard/teacher/portfolio
export async function getTeacherPortfolio(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "teacher" && me.role.name !== "admin") {
        return reply.code(403).send({ error: "Teacher/admin access only" });
    }

    const service = new DashboardService(req.server.supabase);
    const portfolio = await service.getTeacherPortfolio(me.id);
    return reply.send({ portfolio });
}

// PUT /dashboard/teacher/profile
export async function updateTeacherProfile(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "teacher" && me.role.name !== "admin") {
        return reply.code(403).send({ error: "Teacher access only" });
    }

    const service = new DashboardService(req.server.supabase);
    try {
        const profile = await service.updateTeacherProfile(me.id, req.body);
        return reply.send({ profile });
    } catch (err: any) {
        return reply.code(400).send({ error: err.message });
    }
}

// GET /dashboard/teacher/:teacherId/public-portfolio
export async function getPublicTeacherPortfolio(
    req: FastifyRequest<{ Params: { teacherId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new DashboardService(req.server.supabase);
    const portfolio = await service.getPublicTeacherPortfolio(req.params.teacherId);

    if (!portfolio) {
        return reply.code(404).send({ error: "Teacher not found" });
    }

    return reply.send({ portfolio });
}

// GET /dashboard/teacher/:teacherId/ratings (admin)
export async function getTeacherRatings(
    req: FastifyRequest<{ Params: { teacherId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "admin") {
        return reply.code(403).send({ error: "Admin access only" });
    }

    const service = new DashboardService(req.server.supabase);
    const ratings = await service.getTeacherRatings(req.params.teacherId);
    return reply.send({ ratings });
}

// GET /dashboard/session/:sessionId/insights
export async function getSessionInsights(
    req: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Teacher/admin access only" });
    }

    const service = new DashboardService(req.server.supabase);
    const insights = await service.getSessionInsights(req.params.sessionId);

    if (!insights) {
        return reply.code(404).send({ error: "No insights found for this session" });
    }

    return reply.send({ insights });
}

// GET /dashboard/student-profile/:userId/:courseId
export async function getStudentProfile(
    req: FastifyRequest<{ Params: { userId: string; courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Teacher/admin access only" });
    }

    const service = new DashboardService(req.server.supabase);
    const profile = await service.getStudentProfileForTeacher(
        req.params.userId,
        req.params.courseId
    );

    if (!profile) {
        return reply.code(404).send({ error: "Student profile not found" });
    }

    return reply.send({ profile });
}
