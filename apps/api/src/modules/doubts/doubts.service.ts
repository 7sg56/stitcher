import { SupabaseClient } from "@supabase/supabase-js";
import { DoubtThread, DoubtMessage, DoubtThreadWithMessages } from "../../types/database";

export class DoubtsService {
    constructor(private supabase: SupabaseClient) { }

    async createThread(courseId: string, createdBy: string, title: string): Promise<DoubtThread> {
        const { data: thread, error } = await this.supabase
            .from("doubt_threads")
            .insert({
                course_id: courseId,
                created_by: createdBy,
                title,
            })
            .select("*")
            .single();

        if (error) throw error;
        return thread as DoubtThread;
    }

    async listThreadsByCourse(courseId: string): Promise<DoubtThread[]> {
        const { data, error } = await this.supabase
            .from("doubt_threads")
            .select("*")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as DoubtThread[];
    }

    async getThreadWithMessages(
        threadId: string,
        callerRole: string
    ): Promise<DoubtThreadWithMessages | null> {
        const { data: thread, error } = await this.supabase
            .from("doubt_threads")
            .select("*")
            .eq("id", threadId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        const { data: messages } = await this.supabase
            .from("doubt_messages")
            .select("*")
            .eq("thread_id", threadId)
            .order("sent_at");

        const msgs = (messages ?? []) as DoubtMessage[];

        // Fetch display info for message senders
        const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
        if (senderIds.length > 0) {
            // Always fetch aliases for display
            const { data: aliases } = await this.supabase
                .from("aliases")
                .select("user_id, display_name")
                .in("user_id", senderIds)
                .eq("is_active", true);

            const aliasMap = Object.fromEntries(
                (aliases ?? []).map((a: { user_id: string; display_name: string }) => [a.user_id, a.display_name])
            );

            // For teachers: they see aliases only (not real names) -- privacy rule
            // For admins: they can see real names
            // For students: they see aliases
            let nameMap: Record<string, string | null> = {};

            if (callerRole === "admin") {
                const { data: users } = await this.supabase
                    .from("users")
                    .select("id, real_name")
                    .in("id", senderIds);

                nameMap = Object.fromEntries(
                    (users ?? []).map((u: { id: string; real_name: string | null }) => [u.id, u.real_name])
                );
            }

            // Fetch roles for senders to distinguish teacher messages
            const { data: senderUsers } = await this.supabase
                .from("users")
                .select("id, role_id")
                .in("id", senderIds);

            const roleIds = [...new Set((senderUsers ?? []).map((u: { role_id: string }) => u.role_id))];
            const { data: roles } = await this.supabase
                .from("roles")
                .select("id, name")
                .in("id", roleIds);

            const roleMap = Object.fromEntries(
                (roles ?? []).map((r: { id: string; name: string }) => [r.id, r.name])
            );
            const senderRoleMap = Object.fromEntries(
                (senderUsers ?? []).map((u: { id: string; role_id: string }) => [u.id, roleMap[u.role_id] ?? "student"])
            );

            const enrichedMessages = msgs.map((m) => ({
                ...m,
                sender_alias: aliasMap[m.sender_id] ?? "Anonymous",
                sender_name: callerRole === "admin" ? (nameMap[m.sender_id] ?? null) : null,
                sender_role: senderRoleMap[m.sender_id] ?? "student",
            }));

            return {
                ...thread,
                messages: enrichedMessages,
            } as DoubtThreadWithMessages;
        }

        return {
            ...thread,
            messages: [],
        } as DoubtThreadWithMessages;
    }

    async addMessage(threadId: string, senderId: string, content: string): Promise<DoubtMessage> {
        const { data: message, error } = await this.supabase
            .from("doubt_messages")
            .insert({
                thread_id: threadId,
                sender_id: senderId,
                content,
            })
            .select("*")
            .single();

        if (error) throw error;
        return message as DoubtMessage;
    }

    async resolveThread(threadId: string): Promise<DoubtThread> {
        const { data: thread, error } = await this.supabase
            .from("doubt_threads")
            .update({ is_resolved: true })
            .eq("id", threadId)
            .select("*")
            .single();

        if (error) throw error;
        return thread as DoubtThread;
    }
}
