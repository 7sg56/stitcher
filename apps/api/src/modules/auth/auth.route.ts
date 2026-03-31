import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { syncUser, getMe, onboardUser } from "./auth.controller";

const authRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // POST /auth/sync -- upsert user in DB after sign-in
    fastify.post("/sync", syncUser);

    // GET /auth/me -- get current user from DB
    fastify.get("/me", getMe);

    // POST /auth/onboard -- complete onboarding (set name, phone, get alias)
    fastify.post("/onboard", onboardUser);

    done();
};

export default authRoutes;
