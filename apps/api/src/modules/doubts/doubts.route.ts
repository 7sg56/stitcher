import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    createThread,
    listThreads,
    getThread,
    addMessage,
    resolveThread,
    toggleThreadUpvote,
    toggleMessageUpvote,
} from "./doubts.controller";

const doubtsRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    fastify.post("/threads", createThread);
    fastify.get("/threads/course/:courseId", listThreads);
    fastify.get("/threads/:id", getThread);
    fastify.post("/threads/:id/messages", addMessage);
    fastify.patch("/threads/:id/resolve", resolveThread);
    fastify.post("/threads/:id/upvote", toggleThreadUpvote);
    fastify.post("/messages/:id/upvote", toggleMessageUpvote);

    done();
};

export default doubtsRoutes;
