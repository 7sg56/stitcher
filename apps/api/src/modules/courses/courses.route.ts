import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    createCourse,
    listCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    toggleCourseActive,
    regeneratePasskey,
    addUnit,
    deleteUnit,
    addExamSection,
    deleteExamSection,
} from "./courses.controller";

const coursesRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // Course CRUD
    fastify.post("/", createCourse);
    fastify.get("/", listCourses);
    fastify.get("/:id", getCourse);
    fastify.patch("/:id", updateCourse);
    fastify.delete("/:id", deleteCourse);
    fastify.patch("/:id/toggle", toggleCourseActive);
    fastify.patch("/:id/passkey", regeneratePasskey);

    // Units (under courses)
    fastify.post("/:id/units", addUnit);
    fastify.delete("/:id/units/:unitId", deleteUnit);

    // Exam Sections (under courses)
    fastify.post("/:id/exam-sections", addExamSection);
    fastify.delete("/:id/exam-sections/:sectionId", deleteExamSection);

    done();
};

export default coursesRoutes;
