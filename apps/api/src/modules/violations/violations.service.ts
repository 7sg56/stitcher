import { SupabaseClient } from "@supabase/supabase-js";
import { Violation } from "../../types/database";

export class ViolationsService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Log a violation and increment the user's profanity score.
     * Also revokes attendance for the most recent session in the course.
     */
    async logViolation(
        userId: string,
        courseId: string,
        type: string,
        severity: number = 1,
        contentRef?: string
    ): Promise<Violation> {
        const hoursToDeduct = severity; // 1 hour per severity level

        // 1. Insert violation record
        const { data: violation, error } = await this.supabase
            .from("violations")
            .insert({
                user_id: userId,
                course_id: courseId,
                type,
                severity,
                hours_deducted: hoursToDeduct,
                content_ref: contentRef ?? null,
            })
            .select("*")
            .single();

        if (error) throw error;

        // 2. Increment user's profanity_score
        const { data: user } = await this.supabase
            .from("users")
            .select("profanity_score")
            .eq("id", userId)
            .single();

        if (user) {
            await this.supabase
                .from("users")
                .update({ profanity_score: (user.profanity_score || 0) + 1 })
                .eq("id", userId);
        }

        // 3. Deduct attendance hours
        await this.deductAttendanceForViolation(userId, courseId, hoursToDeduct);

        return violation as Violation;
    }

    /**
     * Deduct attendance hours from the most recent attendance record
     * for this student in this course.
     */
    async deductAttendanceForViolation(
        userId: string,
        courseId: string,
        hoursToDeduct: number
    ): Promise<void> {
        // Get all sessions for this course
        const { data: sessions } = await this.supabase
            .from("sessions")
            .select("id")
            .eq("course_id", courseId)
            .order("started_at", { ascending: false });

        if (!sessions || sessions.length === 0) return;

        const sessionIds = sessions.map((s: { id: string }) => s.id);

        // Find the most recent attendance record where the student was actually marked present or late
        const { data: attendance } = await this.supabase
            .from("attendance")
            .select("id")
            .eq("student_id", userId)
            .in("session_id", sessionIds)
            .in("status", ["present", "late"]) // Only deduct if they actually had attendance credit
            .order("marked_at", { ascending: false })
            .limit(1)
            .single();

        if (attendance) {
            // Deduct the entire session by marking them as absent
            await this.supabase
                .from("attendance")
                .update({
                    status: "absent",
                })
                .eq("id", attendance.id);
        }
    }

    async getViolationsByUser(userId: string, courseId?: string): Promise<Violation[]> {
        let query = this.supabase
            .from("violations")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (courseId) {
            query = query.eq("course_id", courseId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Violation[];
    }

    async getViolationsByCourse(courseId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from("violations")
            .select("*")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Fetch aliases for all offenders
        const userIds = [...new Set(data.map((v: { user_id: string }) => v.user_id))];

        const { data: aliases } = await this.supabase
            .from("aliases")
            .select("user_id, display_name")
            .in("user_id", userIds)
            .eq("is_active", true);

        const aliasMap = Object.fromEntries(
            (aliases ?? []).map((a: { user_id: string; display_name: string }) => [a.user_id, a.display_name])
        );

        const { data: users } = await this.supabase
            .from("users")
            .select("id, profanity_score")
            .in("id", userIds);

        const scoreMap = Object.fromEntries(
            (users ?? []).map((u: { id: string; profanity_score: number }) => [u.id, u.profanity_score])
        );

        return data.map((v: any) => ({
            ...v,
            student_alias: aliasMap[v.user_id] ?? "Unknown",
            profanity_score: scoreMap[v.user_id] ?? 0,
        }));
    }

    async getViolationCountByUserAndCourse(userId: string, courseId: string): Promise<number> {
        const { data, error } = await this.supabase
            .from("violations")
            .select("id", { count: "exact" })
            .eq("user_id", userId)
            .eq("course_id", courseId);

        if (error) throw error;
        return data?.length ?? 0;
    }
}
