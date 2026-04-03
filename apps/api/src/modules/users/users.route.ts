import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    getMyProfile,
    getUserProfile,
    updateUserRole,
    toggleShadowBan,
    updateMyTitle,
    listTeachers,
} from "./users.controller";

const usersRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    fastify.get("/me", getMyProfile);
    fastify.get("/teachers", listTeachers);
    fastify.get("/:id", getUserProfile);
    fastify.patch("/:id/role", updateUserRole);
    fastify.patch("/:id/shadow-ban", toggleShadowBan);
    fastify.patch("/me/title", updateMyTitle);

    done();
};

export default usersRoutes;

