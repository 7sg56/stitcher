import { FastifyInstance } from "fastify";
import { getViolationsByCourse, getViolationsByUser, getMyViolations } from "./violations.controller";

export default async function violationsRoutes(fastify: FastifyInstance) {
    fastify.get("/course/:courseId", getViolationsByCourse);
    fastify.get("/user/:userId", getViolationsByUser);
    fastify.get("/my/:courseId", getMyViolations);
}
