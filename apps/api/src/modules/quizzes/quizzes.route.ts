import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    createQuiz,
    listQuizzes,
    getQuiz,
    publishQuiz,
    deleteQuiz,
    addQuestion,
    deleteQuestion,
    startAttempt,
    submitAttempt,
    getMyAttempt,
    listAttempts,
    getDistribution,
} from "./quizzes.controller";

const quizzesRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // Teacher quiz management
    fastify.post("/", createQuiz);
    fastify.get("/course/:courseId", listQuizzes);
    fastify.get("/:id", getQuiz);
    fastify.patch("/:id/publish", publishQuiz);
    fastify.delete("/:id", deleteQuiz);

    // Questions
    fastify.post("/:id/questions", addQuestion);
    fastify.delete("/questions/:questionId", deleteQuestion);

    // Student attempts
    fastify.post("/:id/attempt", startAttempt);
    fastify.post("/attempt/:attemptId/submit", submitAttempt);
    fastify.get("/:id/my-attempt", getMyAttempt);

    // Teacher review
    fastify.get("/:id/attempts", listAttempts);
    fastify.get("/:id/distribution", getDistribution);

    done();
};

export default quizzesRoutes;
