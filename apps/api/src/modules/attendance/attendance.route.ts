import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    markAttendance,
    bulkMarkAttendance,
    getAttendanceBySession,
    getStudentAttendance,
} from "./attendance.controller";

const attendanceRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    fastify.post("/mark", markAttendance);
    fastify.post("/bulk", bulkMarkAttendance);
    fastify.get("/session/:sessionId", getAttendanceBySession);
    fastify.get("/student/:courseId", getStudentAttendance);

    done();
};

export default attendanceRoutes;
