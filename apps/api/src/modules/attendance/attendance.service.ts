import { SupabaseClient } from "@supabase/supabase-js";
import { Attendance, AttendanceWithStudent } from "../../types/database";

export class AttendanceService {
    constructor(private supabase: SupabaseClient) { }

    async markAttendance(sessionId: string, studentId: string, status: string, source: "manual" | "feedback" = "manual"): Promise<Attendance> {
        // Block manual edits after 24 hours post-session
        if (source === "manual") {
            const { data: session } = await this.supabase.from("sessions").select("*").eq("id", sessionId).single();
            if (session) {
                const startedAt = new Date(session.started_at).getTime();
                const durationMs = (session.duration_minutes ?? 60) * 60 * 1000;
                const limitMs = startedAt + durationMs + 24 * 60 * 60 * 1000;
                if (Date.now() > limitMs) {
                    throw new Error("Attendance can only be manually edited within 24 hours of the session ending.");
                }
            }
        }

        // Upsert: if record exists for this student+session, update it
        const { data: existing } = await this.supabase
            .from("attendance")
            .select("id")
            .eq("session_id", sessionId)
            .eq("student_id", studentId)
            .single();

        if (existing) {
            const { data: updated, error } = await this.supabase
                .from("attendance")
                .update({ status, marked_at: new Date().toISOString() })
                .eq("id", existing.id)
                .select("*")
                .single();

            if (error) throw error;
            return updated as Attendance;
        }

        const { data: record, error } = await this.supabase
            .from("attendance")
            .insert({
                session_id: sessionId,
                student_id: studentId,
                status,
                source,
            })
            .select("*")
            .single();

        if (error) throw error;
        return record as Attendance;
    }

    async bulkMarkAttendance(
        sessionId: string,
        records: { student_id: string; status: string }[],
        source: "manual" | "feedback" = "manual"
    ): Promise<Attendance[]> {
        const results: Attendance[] = [];
        for (const record of records) {
            const result = await this.markAttendance(sessionId, record.student_id, record.status, source);
            results.push(result);
        }
        return results;
    }

    async getAttendanceBySession(sessionId: string): Promise<AttendanceWithStudent[]> {
        const { data: records, error } = await this.supabase
            .from("attendance")
            .select("*")
            .eq("session_id", sessionId)
            .order("marked_at");

        if (error) throw error;

        const items = (records ?? []) as Attendance[];
        if (items.length === 0) return [];

        // Fetch student names and aliases
        const studentIds = items.map((a) => a.student_id);
        const { data: users } = await this.supabase
            .from("users")
            .select("id, real_name")
            .in("id", studentIds);

        const { data: aliases } = await this.supabase
            .from("aliases")
            .select("user_id, display_name")
            .in("user_id", studentIds)
            .eq("is_active", true);

        const nameMap = Object.fromEntries(
            (users ?? []).map((u: { id: string; real_name: string | null }) => [u.id, u.real_name])
        );
        const aliasMap = Object.fromEntries(
            (aliases ?? []).map((a: { user_id: string; display_name: string }) => [a.user_id, a.display_name])
        );

        return items.map((a) => ({
            ...a,
            student_name: nameMap[a.student_id] ?? null,
            student_alias: aliasMap[a.student_id] ?? null,
        })) as AttendanceWithStudent[];
    }

    async getAttendanceByStudent(studentId: string, courseId: string): Promise<Attendance[]> {
        // Get all session IDs for this course
        const { data: sessions } = await this.supabase
            .from("sessions")
            .select("id")
            .eq("course_id", courseId);

        if (!sessions || sessions.length === 0) return [];

        const sessionIds = sessions.map((s: { id: string }) => s.id);

        const { data: records, error } = await this.supabase
            .from("attendance")
            .select("*")
            .eq("student_id", studentId)
            .in("session_id", sessionIds)
            .order("marked_at", { ascending: false });

        if (error) throw error;
        return (records ?? []) as Attendance[];
    }
}
