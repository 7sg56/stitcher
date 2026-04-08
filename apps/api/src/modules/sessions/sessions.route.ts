import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    startSession,
    listSessions,
    getSession,
    getActiveSession,
    endSession,
    cancelSession,
} from "./sessions.controller";

const sessionsRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    fastify.post("/", startSession);
    fastify.get("/course/:courseId", listSessions);
    fastify.get("/active/:courseId", getActiveSession);
    fastify.get("/:id", getSession);
    fastify.patch("/:id/end", endSession);
    fastify.patch("/:id/cancel", cancelSession);

    done();
};

export default sessionsRoutes;
