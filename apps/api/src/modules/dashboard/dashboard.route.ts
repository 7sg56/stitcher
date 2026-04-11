import { FastifyInstance } from "fastify";
import {
    getStudentDashboard,
    getTeacherPortfolio,
    updateTeacherProfile,
    getPublicTeacherPortfolio,
    getTeacherRatings,
    getSessionInsights,
    getStudentProfile,
} from "./dashboard.controller";

export default async function dashboardRoutes(fastify: FastifyInstance) {
    fastify.get("/student", getStudentDashboard);
    fastify.get("/teacher/portfolio", getTeacherPortfolio);
    fastify.put("/teacher/profile", updateTeacherProfile);
    fastify.get("/teacher/:teacherId/public-portfolio", getPublicTeacherPortfolio);
    fastify.get("/teacher/:teacherId/ratings", getTeacherRatings);
    fastify.get("/session/:sessionId/insights", getSessionInsights);
    fastify.get("/student-profile/:userId/:courseId", getStudentProfile);
}
