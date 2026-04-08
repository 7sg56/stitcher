import { SupabaseClient } from "@supabase/supabase-js";
import { Quiz, QuizQuestion, QuizQuestionPool, QuizAttempt, QuizResponse, QuizWithQuestions } from "../../types/database";
import { CreateQuizInput, AddQuestionInput } from "./quizzes.schema";

export class QuizzesService {
    constructor(private supabase: SupabaseClient) { }

    // --- Quiz CRUD ---

    async createQuiz(createdBy: string, data: CreateQuizInput): Promise<Quiz> {
        const { data: quiz, error } = await this.supabase
            .from("quizzes")
            .insert({
                course_id: data.course_id,
                unit_id: data.unit_id ?? null,
                created_by: createdBy,
                title: data.title,
                description: data.description ?? null,
                duration_mins: data.duration_mins ?? null,
            })
            .select("*")
            .single();

        if (error) throw error;
        return quiz as Quiz;
    }

    async publishQuiz(quizId: string): Promise<Quiz> {
        const { data: quiz, error } = await this.supabase
            .from("quizzes")
            .update({ is_published: true })
            .eq("id", quizId)
            .select("*")
            .single();

        if (error) throw error;
        return quiz as Quiz;
    }

    async deleteQuiz(quizId: string): Promise<void> {
        const { error } = await this.supabase
            .from("quizzes")
            .delete()
            .eq("id", quizId);
        if (error) throw error;
    }

    async listByCourse(courseId: string, publishedOnly: boolean): Promise<Quiz[]> {
        let query = this.supabase
            .from("quizzes")
            .select("*")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (publishedOnly) {
            query = query.eq("is_published", true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Quiz[];
    }

    async getQuizWithQuestions(quizId: string): Promise<QuizWithQuestions | null> {
        const { data: quiz, error } = await this.supabase
            .from("quizzes")
            .select("*")
            .eq("id", quizId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        const { data: questions } = await this.supabase
            .from("quiz_questions")
            .select("*")
            .eq("quiz_id", quizId)
            .order("order_index");

        const questionIds = (questions ?? []).map((q: { id: string }) => q.id);
        let optionsMap: Record<string, QuizQuestionPool[]> = {};

        if (questionIds.length > 0) {
            const { data: options } = await this.supabase
                .from("quiz_question_pool")
                .select("*")
                .in("question_id", questionIds)
                .order("order_index");

            optionsMap = (options ?? []).reduce((acc: Record<string, QuizQuestionPool[]>, opt: QuizQuestionPool) => {
                const key = opt.question_id;
                if (!acc[key]) acc[key] = [];
                acc[key]!.push(opt);
                return acc;
            }, {});
        }

        return {
            ...quiz,
            questions: (questions ?? []).map((q: QuizQuestion) => ({
                ...q,
                options: optionsMap[q.id] ?? [],
            })),
        } as QuizWithQuestions;
    }

    // --- Questions ---

    async addQuestion(quizId: string, data: AddQuestionInput): Promise<QuizQuestion> {
        const { data: question, error } = await this.supabase
            .from("quiz_questions")
            .insert({
                quiz_id: quizId,
                question_text: data.question_text,
                question_type: data.question_type,
                points: data.points,
                order_index: data.order_index,
            })
            .select("*")
            .single();

        if (error) throw error;

        // Add options if provided
        if (data.options && data.options.length > 0) {
            const optionsToInsert = data.options.map((opt) => ({
                question_id: question.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
                order_index: opt.order_index,
            }));

            await this.supabase.from("quiz_question_pool").insert(optionsToInsert);
        }

        return question as QuizQuestion;
    }

    async deleteQuestion(questionId: string): Promise<void> {
        const { error } = await this.supabase
            .from("quiz_questions")
            .delete()
            .eq("id", questionId);
        if (error) throw error;
    }

    // --- Student Attempts ---

    async startAttempt(quizId: string, studentId: string): Promise<QuizAttempt> {
        // Check if student already attempted
        const { data: existing } = await this.supabase
            .from("quiz_attempts")
            .select("id")
            .eq("quiz_id", quizId)
            .eq("student_id", studentId)
            .single();

        if (existing) {
            throw new Error("You have already attempted this quiz");
        }

        const { data: attempt, error } = await this.supabase
            .from("quiz_attempts")
            .insert({
                quiz_id: quizId,
                student_id: studentId,
            })
            .select("*")
            .single();

        if (error) throw error;
        return attempt as QuizAttempt;
    }

    async submitAttempt(
        attemptId: string,
        responses: { question_id: string; selected_option_id?: string; text_answer?: string }[]
    ): Promise<QuizAttempt> {
        // Get attempt details
        const { data: attempt, error: attemptError } = await this.supabase
            .from("quiz_attempts")
            .select("*")
            .eq("id", attemptId)
            .single();

        if (attemptError || !attempt) throw new Error("Attempt not found");
        if (attempt.submitted_at) throw new Error("Attempt already submitted");

        // Get correct answers for auto-grading MCQ/true_false
        const questionIds = responses.map((r) => r.question_id);
        const { data: questions } = await this.supabase
            .from("quiz_questions")
            .select("id, question_type, points")
            .in("id", questionIds);

        const questionMap = Object.fromEntries(
            (questions ?? []).map((q: { id: string; question_type: string; points: number }) => [q.id, q])
        );

        let totalScore = 0;
        let maxScore = 0;

        const responsesToInsert: {
            attempt_id: string;
            question_id: string;
            selected_option_id: string | null;
            text_answer: string | null;
            is_correct: boolean | null;
            points_awarded: number;
        }[] = [];

        for (const resp of responses) {
            const question = questionMap[resp.question_id] as { id: string; question_type: string; points: number } | undefined;
            if (!question) continue;

            maxScore += question.points;
            let isCorrect: boolean | null = null;
            let pointsAwarded = 0;

            if (question.question_type === "mcq" || question.question_type === "true_false") {
                if (resp.selected_option_id) {
                    const { data: option } = await this.supabase
                        .from("quiz_question_pool")
                        .select("is_correct")
                        .eq("id", resp.selected_option_id)
                        .single();

                    isCorrect = option?.is_correct ?? false;
                    pointsAwarded = isCorrect ? question.points : 0;
                }
            } else {
                // short_answer: leave for manual grading
                isCorrect = null;
                pointsAwarded = 0;
            }

            totalScore += pointsAwarded;

            responsesToInsert.push({
                attempt_id: attemptId,
                question_id: resp.question_id,
                selected_option_id: resp.selected_option_id ?? null,
                text_answer: resp.text_answer ?? null,
                is_correct: isCorrect,
                points_awarded: pointsAwarded,
            });
        }

        // Insert all responses
        await this.supabase.from("quiz_responses").insert(responsesToInsert);

        // Update attempt with score
        const { data: updated, error } = await this.supabase
            .from("quiz_attempts")
            .update({
                submitted_at: new Date().toISOString(),
                score: totalScore,
                max_score: maxScore,
            })
            .eq("id", attemptId)
            .select("*")
            .single();

        if (error) throw error;
        return updated as QuizAttempt;
    }

    async getAttemptWithResponses(attemptId: string): Promise<{ attempt: QuizAttempt; responses: QuizResponse[] } | null> {
        const { data: attempt, error } = await this.supabase
            .from("quiz_attempts")
            .select("*")
            .eq("id", attemptId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        const { data: responses } = await this.supabase
            .from("quiz_responses")
            .select("*")
            .eq("attempt_id", attemptId);

        return {
            attempt: attempt as QuizAttempt,
            responses: (responses ?? []) as QuizResponse[],
        };
    }

    async getStudentAttempt(quizId: string, studentId: string): Promise<QuizAttempt | null> {
        const { data, error } = await this.supabase
            .from("quiz_attempts")
            .select("*")
            .eq("quiz_id", quizId)
            .eq("student_id", studentId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;
        return data as QuizAttempt;
    }
}
