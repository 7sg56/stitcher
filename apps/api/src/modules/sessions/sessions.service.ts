import { SupabaseClient } from "@supabase/supabase-js";
import { Session } from "../../types/database";
import { CreateSessionInput } from "./sessions.schema";
import { QuizzesService } from "../quizzes/quizzes.service";
import { enqueueSessionAggregation } from "../../core/queue/queue";

export class SessionsService {
    constructor(private supabase: SupabaseClient) { }

    async startSession(teacherId: string, data: CreateSessionInput): Promise<Session> {
        // Check for an already active session for this course
        const { data: active } = await this.supabase
            .from("sessions")
            .select("id")
            .eq("course_id", data.course_id)
            .is("ended_at", null)
            .eq("is_cancelled", false)
            .limit(1);

        if (active && active.length > 0) {
            throw new Error("There is already an active session for this course. End it before starting a new one.");
        }

        let quizId = data.quiz_id ?? null;

        if (data.questions && data.questions.length > 0) {
            const quizzesSvc = new QuizzesService(this.supabase);
            const quiz = await quizzesSvc.createQuiz(teacherId, {
                course_id: data.course_id,
                title: `Feedback: ${(data.topic || 'Untitled Session')}`,
                description: `Feedback questions for session`,
            });
            await quizzesSvc.publishQuiz(quiz.id);

            for (let i = 0; i < data.questions.length; i++) {
                const q = data.questions![i];
                if (!q) continue;
                await quizzesSvc.addQuestion(quiz.id, {
                    question_text: q.question_text,
                    question_type: "mcq",
                    points: q.points ?? 1,
                    order_index: i + 1,
                    options: q.options.map((opt, o_i) => ({
                        option_text: opt,
                        is_correct: o_i === (q.correct_index ?? 0),
                        order_index: o_i + 1
                    }))
                });
            }
            quizId = quiz.id;
        }

        const { data: session, error } = await this.supabase
            .from("sessions")
            .insert({
                course_id: data.course_id,
                teacher_id: teacherId,
                topic: data.topic ?? null,
                location: data.location ?? null,
                duration_minutes: data.duration_minutes ?? 60,
                quiz_id: quizId,
            })
            .select("*")
            .single();

        if (error) throw error;
        return session as Session;
    }

    async endSession(sessionId: string): Promise<Session> {
        const { data: session, error } = await this.supabase
            .from("sessions")
            .update({ ended_at: new Date().toISOString() })
            .eq("id", sessionId)
            .is("ended_at", null)
            .select("*")
            .single();

        if (error) throw error;

        // Aggregate ratings (async via BullMQ, synchronous fallback if Redis down)
        enqueueSessionAggregation(sessionId).catch(err =>
            console.error("Aggregation failed for session (even fallback):", sessionId, err)
        );

        return session as Session;
    }

    async cancelSession(sessionId: string): Promise<Session> {
        const { data: session, error } = await this.supabase
            .from("sessions")
            .update({ is_cancelled: true, ended_at: new Date().toISOString() })
            .eq("id", sessionId)
            .select("*")
            .single();

        if (error) throw error;
        return session as Session;
    }

    async getSessionById(sessionId: string): Promise<Session | null> {
        const { data: session, error } = await this.supabase
            .from("sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;
        return session as Session;
    }

    async listSessionsByCourse(courseId: string): Promise<Session[]> {
        const { data: sessions, error } = await this.supabase
            .from("sessions")
            .select("*")
            .eq("course_id", courseId)
            .order("started_at", { ascending: false });

        if (error) throw error;

        const validSessions = [];
        for (const session of (sessions ?? []) as Session[]) {
            if (!session.ended_at && !session.is_cancelled) {
                const startedAt = new Date(session.started_at).getTime();
                const durationMs = (session.duration_minutes ?? 60) * 60 * 1000;
                if (Date.now() > startedAt + durationMs) {
                    await this.supabase
                        .from("sessions")
                        .update({ ended_at: new Date(startedAt + durationMs).toISOString() })
                        .eq("id", session.id)
                        .is("ended_at", null);
                    session.ended_at = new Date(startedAt + durationMs).toISOString();

                    // Aggregate ratings for auto-ended session
                    enqueueSessionAggregation(session.id).catch(err =>
                        console.error("Aggregation failed for auto-ended session (even fallback):", session.id, err)
                    );
                }
            }
            validSessions.push(session);
        }

        return validSessions;
    }

    async getActiveSession(courseId: string): Promise<Session | null> {
        const { data: sessions, error } = await this.supabase
            .from("sessions")
            .select("*")
            .eq("course_id", courseId)
            .is("ended_at", null)
            .eq("is_cancelled", false)
            .limit(1);

        if (error) throw error;
        if (!sessions || sessions.length === 0) return null;

        const session = sessions[0] as Session;
        const startedAt = new Date(session.started_at).getTime();
        const durationMs = (session.duration_minutes ?? 60) * 60 * 1000;

        if (Date.now() > startedAt + durationMs) {
            await this.endSession(session.id);
            return null;
        }

        return session;
    }
}
