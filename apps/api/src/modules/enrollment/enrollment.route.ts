import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    enrollByPasskey,
    teacherAddStudent,
    teacherRemoveStudent,
    dropEnrollment,
    getMyEnrollments,
    getEnrollmentsByCourse,
} from "./enrollment.controller";

const enrollmentRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // Student passkey enrollment
    fastify.post("/passkey", enrollByPasskey);

    // Teacher manages students
    fastify.post("/manage", teacherAddStudent);
    fastify.delete("/manage/:id", teacherRemoveStudent);

    // Student's own enrollments
    fastify.get("/my", getMyEnrollments);
    fastify.delete("/:id", dropEnrollment);

    // Teacher/admin: enrolled students
    fastify.get("/course/:courseId", getEnrollmentsByCourse);

    done();
};

export default enrollmentRoutes;
