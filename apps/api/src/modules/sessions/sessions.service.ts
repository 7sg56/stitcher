import { SupabaseClient } from "@supabase/supabase-js";
import { Session } from "../../types/database";
import { CreateSessionInput } from "./sessions.schema";

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

        const { data: session, error } = await this.supabase
            .from("sessions")
            .insert({
                course_id: data.course_id,
                teacher_id: teacherId,
                topic: data.topic ?? null,
                location: data.location ?? null,
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
        return (sessions ?? []) as Session[];
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
        return sessions[0] as Session;
    }
}
