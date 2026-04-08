import { SupabaseClient } from "@supabase/supabase-js";
import { Feedback, FeedbackWindow } from "../../types/database";
import { OpenFeedbackWindowInput } from "./feedback.schema";

export class FeedbackService {
    constructor(private supabase: SupabaseClient) { }

    // --- Feedback Windows ---

    async openWindow(openedBy: string, data: OpenFeedbackWindowInput): Promise<FeedbackWindow> {
        // Check if a window already exists for this session
        const { data: existing } = await this.supabase
            .from("feedback_windows")
            .select("id, is_open")
            .eq("session_id", data.session_id)
            .single();

        if (existing) {
            if (existing.is_open) {
                throw new Error("A feedback window is already open for this session");
            }
            // Reopen closed window
            const { data: reopened, error } = await this.supabase
                .from("feedback_windows")
                .update({ is_open: true, opened_at: new Date().toISOString(), closed_at: null })
                .eq("id", existing.id)
                .select("*")
                .single();

            if (error) throw error;
            return reopened as FeedbackWindow;
        }

        const { data: window, error } = await this.supabase
            .from("feedback_windows")
            .insert({
                session_id: data.session_id,
                unit_id: data.unit_id ?? null,
                opened_by: openedBy,
            })
            .select("*")
            .single();

        if (error) throw error;
        return window as FeedbackWindow;
    }

    async closeWindow(windowId: string): Promise<FeedbackWindow> {
        const { data: window, error } = await this.supabase
            .from("feedback_windows")
            .update({ is_open: false, closed_at: new Date().toISOString() })
            .eq("id", windowId)
            .select("*")
            .single();

        if (error) throw error;
        return window as FeedbackWindow;
    }

    async getWindowBySession(sessionId: string): Promise<FeedbackWindow | null> {
        const { data, error } = await this.supabase
            .from("feedback_windows")
            .select("*")
            .eq("session_id", sessionId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;
        return data as FeedbackWindow;
    }

    // --- Feedback Submission ---

    async submitFeedback(
        studentId: string,
        sessionId: string,
        rating: number,
        comment?: string,
        isAnonymous?: boolean
    ): Promise<Feedback> {
        // Verify feedback window is open for this session
        const window = await this.getWindowBySession(sessionId);
        if (!window || !window.is_open) {
            throw new Error("Feedback window is not open for this session");
        }

        // Check if student already submitted
        const { data: existing } = await this.supabase
            .from("feedback")
            .select("id")
            .eq("student_id", studentId)
            .eq("session_id", sessionId)
            .single();

        if (existing) {
            throw new Error("You have already submitted feedback for this session");
        }

        const { data: feedback, error } = await this.supabase
            .from("feedback")
            .insert({
                student_id: studentId,
                session_id: sessionId,
                rating,
                comment: comment ?? null,
                is_anonymous: isAnonymous ?? false,
            })
            .select("*")
            .single();

        if (error) throw error;
        return feedback as Feedback;
    }

    async getFeedbackBySession(sessionId: string): Promise<Feedback[]> {
        const { data, error } = await this.supabase
            .from("feedback")
            .select("*")
            .eq("session_id", sessionId)
            .order("submitted_at");

        if (error) throw error;
        return (data ?? []) as Feedback[];
    }

    async getAverageRatingByCourse(courseId: string): Promise<{ average_rating: number; total_feedback: number }> {
        // Get all sessions for this course
        const { data: sessions } = await this.supabase
            .from("sessions")
            .select("id")
            .eq("course_id", courseId);

        if (!sessions || sessions.length === 0) {
            return { average_rating: 0, total_feedback: 0 };
        }

        const sessionIds = sessions.map((s: { id: string }) => s.id);

        const { data: feedbacks, error } = await this.supabase
            .from("feedback")
            .select("rating")
            .in("session_id", sessionIds);

        if (error) throw error;

        const items = (feedbacks ?? []) as { rating: number }[];
        if (items.length === 0) {
            return { average_rating: 0, total_feedback: 0 };
        }

        const sum = items.reduce((acc, f) => acc + f.rating, 0);
        return {
            average_rating: Math.round((sum / items.length) * 10) / 10,
            total_feedback: items.length,
        };
    }
}
