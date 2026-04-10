import { SupabaseClient } from "@supabase/supabase-js";
import { Feedback, FeedbackWindow } from "../../types/database";
import { OpenFeedbackWindowInput } from "./feedback.schema";
import { AttendanceService } from "../attendance/attendance.service";

export class FeedbackService {
    constructor(private supabase: SupabaseClient) { }

    // --- Feedback Windows ---

    async openWindow(openedBy: string, data: OpenFeedbackWindowInput): Promise<FeedbackWindow> {
        throw new Error("Feedback windows are now automatically managed based on session duration.");
    }

    async closeWindow(windowId: string): Promise<FeedbackWindow> {
        throw new Error("Feedback windows are now automatically managed based on session duration.");
    }

    async getWindowBySession(sessionId: string): Promise<FeedbackWindow | null> {
        const { data: session } = await this.supabase
            .from("sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        if (!session) return null;

        const startedAt = new Date(session.started_at).getTime();
        const durationMs = (session.duration_minutes ?? 60) * 60 * 1000;
        const limitMs = startedAt + durationMs + 60 * 60 * 1000;
        const isOpen = Date.now() <= limitMs && !session.is_cancelled;

        return {
            id: `window-${sessionId}`,
            session_id: sessionId,
            unit_id: null,
            is_open: isOpen,
            opened_at: session.started_at,
            closed_at: isOpen ? null : new Date(limitMs).toISOString(),
        } as FeedbackWindow;
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

        // Raw rating stored as-is; weighting is deferred to the async
        // BullMQ aggregation worker (Phase 5) to avoid DB locks during
        // the 30-second feedback submission burst.

        const { data: feedback, error } = await this.supabase
            .from("feedback")
            .insert({
                student_id: studentId,
                session_id: sessionId,
                rating,
                comment: comment ?? null,
                is_anonymous: true,
            })
            .select("*")
            .single();

        if (error) throw error;

        const attendanceSvc = new AttendanceService(this.supabase);
        await attendanceSvc.markAttendance(sessionId, studentId, "present", "feedback");

        return feedback as Feedback;
    }

    async getFeedbackBySession(sessionId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from("feedback")
            .select("*, users:student_id(real_name)")
            .eq("session_id", sessionId)
            .order("submitted_at");

        if (error) throw error;

        return (data || []).map((fb: any) => {
            return {
                ...fb,
                student_name: fb.is_anonymous ? "Anonymous Student" : (fb.users?.real_name || "Unknown"),
            };
        });
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
