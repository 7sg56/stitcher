import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    createCourse,
    listCourses,
    getCourse,
    updateCourse,
    toggleCourseActive,
} from "./courses.controller";

const coursesRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // POST /courses -- create a new course
    fastify.post("/", createCourse);

    // GET /courses -- list all courses
    fastify.get("/", listCourses);

    // GET /courses/:id -- get course detail
    fastify.get("/:id", getCourse);

    // PATCH /courses/:id -- update a course
    fastify.patch("/:id", updateCourse);

    // PATCH /courses/:id/toggle -- toggle active status
    fastify.patch("/:id/toggle", toggleCourseActive);

    done();
};

export default coursesRoutes;
