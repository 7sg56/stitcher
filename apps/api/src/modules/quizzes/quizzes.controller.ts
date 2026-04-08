import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { AuthService } from "../auth/auth.service";
import { QuizzesService } from "./quizzes.service";
import { createQuizSchema, addQuestionSchema, submitAttemptSchema } from "./quizzes.schema";

async function getCurrentUser(req: FastifyRequest, reply: FastifyReply) {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) {
        reply.code(401).send({ error: "Not authenticated" });
        return null;
    }
    const authService = new AuthService(req.server.supabase);
    const user = await authService.getUserByClerkId(clerkId);
    if (!user) {
        reply.code(404).send({ error: "User not found" });
        return null;
    }
    return user;
}

// POST /quizzes
export async function createQuiz(req: FastifyRequest, reply: FastifyReply) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can create quizzes" });
    }

    const body = createQuizSchema.parse(req.body);
    const service = new QuizzesService(req.server.supabase);

    try {
        const quiz = await service.createQuiz(me.id, body);
        return reply.code(201).send({ quiz });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create quiz";
        return reply.code(400).send({ error: message });
    }
}

// GET /quizzes/course/:courseId
export async function listQuizzes(
    req: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new QuizzesService(req.server.supabase);
    const publishedOnly = me.role.name === "student";
    const quizzes = await service.listByCourse(req.params.courseId, publishedOnly);
    return reply.send({ quizzes });
}

// GET /quizzes/:id
export async function getQuiz(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new QuizzesService(req.server.supabase);
    const quiz = await service.getQuizWithQuestions(req.params.id);

    if (!quiz) {
        return reply.code(404).send({ error: "Quiz not found" });
    }

    // Students should not see correct answers
    if (me.role.name === "student") {
        const sanitized = {
            ...quiz,
            questions: quiz.questions.map((q) => ({
                ...q,
                options: q.options.map((opt) => ({
                    id: opt.id,
                    question_id: opt.question_id,
                    option_text: opt.option_text,
                    order_index: opt.order_index,
                    // Omit is_correct
                })),
            })),
        };
        return reply.send({ quiz: sanitized });
    }

    return reply.send({ quiz });
}

// PATCH /quizzes/:id/publish
export async function publishQuiz(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can publish quizzes" });
    }

    const service = new QuizzesService(req.server.supabase);
    try {
        const quiz = await service.publishQuiz(req.params.id);
        return reply.send({ quiz });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to publish quiz";
        return reply.code(400).send({ error: message });
    }
}

// DELETE /quizzes/:id
export async function deleteQuiz(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can delete quizzes" });
    }

    const service = new QuizzesService(req.server.supabase);
    try {
        await service.deleteQuiz(req.params.id);
        return reply.send({ message: "Quiz deleted" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete quiz";
        return reply.code(400).send({ error: message });
    }
}

// POST /quizzes/:id/questions
export async function addQuestion(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can add questions" });
    }

    const body = addQuestionSchema.parse(req.body);
    const service = new QuizzesService(req.server.supabase);

    try {
        const question = await service.addQuestion(req.params.id, body);
        return reply.code(201).send({ question });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add question";
        return reply.code(400).send({ error: message });
    }
}

// DELETE /quizzes/questions/:questionId
export async function deleteQuestion(
    req: FastifyRequest<{ Params: { questionId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name === "student") {
        return reply.code(403).send({ error: "Only teachers and admins can delete questions" });
    }

    const service = new QuizzesService(req.server.supabase);
    try {
        await service.deleteQuestion(req.params.questionId);
        return reply.send({ message: "Question deleted" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete question";
        return reply.code(400).send({ error: message });
    }
}

// POST /quizzes/:id/attempt -- student starts an attempt
export async function startAttempt(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "student") {
        return reply.code(403).send({ error: "Only students can attempt quizzes" });
    }

    const service = new QuizzesService(req.server.supabase);
    try {
        const attempt = await service.startAttempt(req.params.id, me.id);
        return reply.code(201).send({ attempt });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to start attempt";
        return reply.code(400).send({ error: message });
    }
}

// POST /quizzes/attempt/:attemptId/submit
export async function submitAttempt(
    req: FastifyRequest<{ Params: { attemptId: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    if (me.role.name !== "student") {
        return reply.code(403).send({ error: "Only students can submit quiz attempts" });
    }

    const body = submitAttemptSchema.parse(req.body);
    const service = new QuizzesService(req.server.supabase);

    try {
        const attempt = await service.submitAttempt(req.params.attemptId, body.responses);
        return reply.send({ attempt });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to submit attempt";
        return reply.code(400).send({ error: message });
    }
}

// GET /quizzes/:id/my-attempt -- student views their attempt
export async function getMyAttempt(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const me = await getCurrentUser(req, reply);
    if (!me) return;

    const service = new QuizzesService(req.server.supabase);
    const attempt = await service.getStudentAttempt(req.params.id, me.id);

    if (!attempt) {
        return reply.send({ attempt: null });
    }

    const result = await service.getAttemptWithResponses(attempt.id);
    return reply.send(result);
}
