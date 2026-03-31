import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "./auth.service";
import { syncUserSchema, onboardUserSchema } from "./auth.schema";

export async function syncUser(req: FastifyRequest, reply: FastifyReply) {
    const { userId } = getAuth(req);

    if (!userId) {
        return reply.code(401).send({ error: "Not authenticated" });
    }

    const body = syncUserSchema.parse(req.body);
    const service = new AuthService(req.server.supabase);
    const user = await service.upsertUser(userId, body);

    return reply.send({ user });
}

export async function getMe(req: FastifyRequest, reply: FastifyReply) {
    const { userId } = getAuth(req);

    if (!userId) {
        return reply.code(401).send({ error: "Not authenticated" });
    }

    const service = new AuthService(req.server.supabase);
    const user = await service.getUserByClerkId(userId);

    if (!user) {
        return reply.code(404).send({ error: "User not found. Call /auth/sync first." });
    }

    return reply.send({ user });
}

export async function onboardUser(req: FastifyRequest, reply: FastifyReply) {
    const { userId } = getAuth(req);

    if (!userId) {
        return reply.code(401).send({ error: "Not authenticated" });
    }

    const body = onboardUserSchema.parse(req.body);
    const service = new AuthService(req.server.supabase);

    try {
        const result = await service.completeOnboarding(userId, body);
        return reply.send({
            user: result.user,
            alias: result.alias,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Onboarding failed";
        return reply.code(400).send({ error: message });
    }
}
