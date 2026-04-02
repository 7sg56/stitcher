import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    createSubject,
    listSubjectsByCourse,
    getSubject,
    createUnit,
    listUnits,
    createExamSection,
    listExamSections,
} from "./subjects.controller";

const subjectsRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    // POST /subjects -- create a subject
    fastify.post("/", createSubject);

    // GET /subjects/course/:courseId -- list subjects for a course
    fastify.get("/course/:courseId", listSubjectsByCourse);

    // GET /subjects/:id -- get subject detail
    fastify.get("/:id", getSubject);

    // POST /subjects/:id/units -- create a unit
    fastify.post("/:id/units", createUnit);

    // GET /subjects/:id/units -- list units
    fastify.get("/:id/units", listUnits);

    // POST /subjects/:id/exam-sections -- create an exam section
    fastify.post("/:id/exam-sections", createExamSection);

    // GET /subjects/:id/exam-sections -- list exam sections
    fastify.get("/:id/exam-sections", listExamSections);

    done();
};

export default subjectsRoutes;
