import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { UsersService } from "./users.service";
import { updateRoleSchema, toggleShadowBanSchema } from "./users.schema";

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

// GET /users/me -- own full profile
export async function getMyProfile(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new UsersService(req.server.supabase);
    // For own profile, use admin-level visibility (show everything)
    const profile = service.buildProfile(me, "admin");
    return reply.send({ profile });
}

// GET /users/:id -- other user's profile (visibility-filtered)
export async function getUserProfile(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new UsersService(req.server.supabase);
    const target = await service.getUserById(req.params.id);

    if (!target) {
        return reply.code(404).send({ error: "User not found" });
    }

    const profile = service.buildProfile(target, me.role.name);
    return reply.send({ profile });
}

// PATCH /users/:id/role -- admin only, promote/change role
export async function updateUserRole(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "admin") {
        return reply.code(403).send({ error: "Only admins can change roles" });
    }

    const body = updateRoleSchema.parse(req.body);
    const service = new UsersService(req.server.supabase);

    try {
        await service.updateRole(req.params.id, body.role);
        return reply.send({ success: true, message: `Role updated to ${body.role}` });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update role";
        return reply.code(400).send({ error: message });
    }
}

// PATCH /users/:id/shadow-ban -- admin only, toggle shadow ban
export async function toggleShadowBan(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "admin") {
        return reply.code(403).send({ error: "Only admins can toggle shadow bans" });
    }

    const body = toggleShadowBanSchema.parse(req.body);
    const service = new UsersService(req.server.supabase);

    try {
        await service.toggleShadowBan(req.params.id, body.is_shadow_banned);
        return reply.send({
            success: true,
            message: body.is_shadow_banned ? "User shadow banned" : "Shadow ban removed",
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to toggle shadow ban";
        return reply.code(400).send({ error: message });
    }
}
