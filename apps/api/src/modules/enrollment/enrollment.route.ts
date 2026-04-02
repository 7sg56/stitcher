import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    enrollInCourse,
    dropEnrollment,
    getMyEnrollments,
    getEnrollmentsByCourse,
} from "./enrollment.controller";

const enrollmentRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // POST /enrollment -- enroll in a course
    fastify.post("/", enrollInCourse);

    // GET /enrollment/my -- get my enrollments
    fastify.get("/my", getMyEnrollments);

    // DELETE /enrollment/:id -- drop an enrollment
    fastify.delete("/:id", dropEnrollment);

    // GET /enrollment/course/:courseId -- list enrollments for a course
    fastify.get("/course/:courseId", getEnrollmentsByCourse);

    done();
};

export default enrollmentRoutes;
