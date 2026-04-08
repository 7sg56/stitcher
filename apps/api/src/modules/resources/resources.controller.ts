import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { ResourcesService } from "./resources.service";
import { createResourceSchema } from "./resources.schema";

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

// POST /resources
export async function createResource(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can upload resources" });
    }

    const body = createResourceSchema.parse(req.body);
    const service = new ResourcesService(req.server.supabase);

    try {
        const resource = await service.createResource(me.id, body);
        return reply.code(201).send({ resource });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create resource";
        return reply.code(400).send({ error: message });
    }
}

// GET /resources/course/:courseId
export async function listResourcesByCourse(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new ResourcesService(req.server.supabase);
    const resources = await service.listByCourse(req.params.courseId);
    return reply.send({ resources });
}

// GET /resources/unit/:unitId
export async function listResourcesByUnit(
    req: FastifyRequest<{ Params: { unitId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new ResourcesService(req.server.supabase);
    const resources = await service.listByUnit(req.params.unitId);
    return reply.send({ resources });
}

// GET /resources/exam-section/:sectionId
export async function listResourcesByExamSection(
    req: FastifyRequest<{ Params: { sectionId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new ResourcesService(req.server.supabase);
    const resources = await service.listByExamSection(req.params.sectionId);
    return reply.send({ resources });
}

// DELETE /resources/:id
export async function deleteResource(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can delete resources" });
    }

    const service = new ResourcesService(req.server.supabase);
    try {
        await service.deleteResource(req.params.id);
        return reply.send({ message: "Resource deleted" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete resource";
        return reply.code(400).send({ error: message });
    }
}
