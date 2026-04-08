import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    openFeedbackWindow,
    closeFeedbackWindow,
    getFeedbackWindow,
    submitFeedback,
    getFeedbackBySession,
    getCourseRating,
} from "./feedback.controller";

const feedbackRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // Feedback windows (teacher)
    fastify.post("/window", openFeedbackWindow);
    fastify.patch("/window/:id/close", closeFeedbackWindow);
    fastify.get("/window/session/:sessionId", getFeedbackWindow);

    // Feedback submission (student)
    fastify.post("/", submitFeedback);

    // View feedback
    fastify.get("/session/:sessionId", getFeedbackBySession);
    fastify.get("/rating/:courseId", getCourseRating);

    done();
};

export default feedbackRoutes;
