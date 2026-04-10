import { FastifyInstance } from "fastify";
import {
    getStudentDashboard,
    getTeacherPortfolio,
    getTeacherRatings,
    getSessionInsights,
} from "./dashboard.controller";

export default async function dashboardRoutes(fastify: FastifyInstance) {
    fastify.get("/student", getStudentDashboard);
    fastify.get("/teacher/portfolio", getTeacherPortfolio);
    fastify.get("/teacher/:teacherId/ratings", getTeacherRatings);
    fastify.get("/session/:sessionId/insights", getSessionInsights);
}
