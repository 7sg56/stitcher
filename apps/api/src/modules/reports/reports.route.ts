import { FastifyInstance } from "fastify";
import { submitReport, getReportsByCourse } from "./reports.controller";

export default async function reportsRoutes(app: FastifyInstance) {
    app.post("/", submitReport);
    app.get("/course/:courseId", getReportsByCourse);
}
