import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { SubjectsService } from "./subjects.service";
import {
    createSubjectSchema,
    createUnitSchema,
    createExamSectionSchema,
} from "./subjects.schema";

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

// POST /subjects -- create a subject (teacher/admin only)
export async function createSubject(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can create subjects" });
    }

    const body = createSubjectSchema.parse(req.body);
    const service = new SubjectsService(req.server.supabase);

    try {
        const subject = await service.createSubject(body);
        return reply.code(201).send({ subject });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create subject";
        return reply.code(400).send({ error: message });
    }
}

// GET /subjects/course/:courseId -- list subjects for a course
export async function listSubjectsByCourse(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new SubjectsService(req.server.supabase);
    const subjects = await service.listSubjectsByCourse(req.params.courseId);

    return reply.send({ subjects });
}

// GET /subjects/:id -- get subject detail with units and exam sections
export async function getSubject(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new SubjectsService(req.server.supabase);
    const subject = await service.getSubjectById(req.params.id);

    if (!subject) {
        return reply.code(404).send({ error: "Subject not found" });
    }

    return reply.send({ subject });
}

// POST /subjects/:id/units -- create a unit (teacher/admin only)
export async function createUnit(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can create units" });
    }

    const body = createUnitSchema.parse(req.body);
    const service = new SubjectsService(req.server.supabase);

    try {
        const unit = await service.createUnit(req.params.id, body);
        return reply.code(201).send({ unit });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create unit";
        return reply.code(400).send({ error: message });
    }
}

// GET /subjects/:id/units -- list units for a subject
export async function listUnits(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new SubjectsService(req.server.supabase);
    const units = await service.listUnitsBySubject(req.params.id);

    return reply.send({ units });
}

// POST /subjects/:id/exam-sections -- create an exam section (teacher/admin only)
export async function createExamSection(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can create exam sections" });
    }

    const body = createExamSectionSchema.parse(req.body);
    const service = new SubjectsService(req.server.supabase);

    try {
        const section = await service.createExamSection(req.params.id, body);
        return reply.code(201).send({ exam_section: section });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create exam section";
        return reply.code(400).send({ error: message });
    }
}

// GET /subjects/:id/exam-sections -- list exam sections for a subject
export async function listExamSections(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new SubjectsService(req.server.supabase);
    const examSections = await service.listExamSectionsBySubject(req.params.id);

    return reply.send({ exam_sections: examSections });
}
