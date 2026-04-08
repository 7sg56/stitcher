import { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
    createResource,
    listResourcesByCourse,
    listResourcesByUnit,
    listResourcesByExamSection,
    deleteResource,
} from "./resources.controller";

const resourcesRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
    fastify.post("/", createResource);
    fastify.get("/course/:courseId", listResourcesByCourse);
    fastify.get("/unit/:unitId", listResourcesByUnit);
    fastify.get("/exam-section/:sectionId", listResourcesByExamSection);
    fastify.delete("/:id", deleteResource);

    done();
};

export default resourcesRoutes;
