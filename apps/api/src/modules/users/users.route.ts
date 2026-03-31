import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    getMyProfile,
    getUserProfile,
    updateUserRole,
    toggleShadowBan,
} from "./users.controller";

const usersRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // GET /users/me -- own full profile
    fastify.get("/me", getMyProfile);

    // GET /users/:id -- other user's profile (visibility-filtered)
    fastify.get("/:id", getUserProfile);

    // PATCH /users/:id/role -- admin only, change user role
    fastify.patch("/:id/role", updateUserRole);

    // PATCH /users/:id/shadow-ban -- admin only, toggle shadow ban
    fastify.patch("/:id/shadow-ban", toggleShadowBan);

    done();
};

export default usersRoutes;
