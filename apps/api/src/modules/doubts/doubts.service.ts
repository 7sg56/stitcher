import { SupabaseClient } from "@supabase/supabase-js";
import { DoubtThread, DoubtMessage, DoubtThreadWithMessages } from "../../types/database";
import { checkProfanity } from "../../core/utils/profanity";
import { ViolationsService } from "../violations/violations.service";

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

    async listThreadsByCourse(courseId: string, callerId: string): Promise<DoubtThread[]> {
        const { data, error } = await this.supabase
            .from("doubt_threads")
            .select("*, doubt_thread_upvotes(user_id)")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (data ?? []).map((t: any) => ({
            ...t,
            user_has_upvoted: t.doubt_thread_upvotes?.some((v: any) => v.user_id === callerId) ?? false,
            doubt_thread_upvotes: undefined
        })) as DoubtThread[];
    }

    async getThreadWithMessages(
        threadId: string,
        callerRole: string,
        callerId: string
    ): Promise<DoubtThreadWithMessages | null> {
        const { data: threadData, error } = await this.supabase
            .from("doubt_threads")
            .select("*, doubt_thread_upvotes(user_id)")
            .eq("id", threadId)
            .single();

        if (error && error.code === "PGRST116") return null;
        if (error) throw error;

        const thread = {
            ...threadData,
            user_has_upvoted: threadData.doubt_thread_upvotes?.some((v: any) => v.user_id === callerId) ?? false,
            doubt_thread_upvotes: undefined
        };

        const { data: messagesData } = await this.supabase
            .from("doubt_messages")
            .select("*, doubt_message_upvotes(user_id)")
            .eq("thread_id", threadId)
            .order("sent_at");

        const msgs = (messagesData ?? []).map((m: any) => ({
            ...m,
            user_has_upvoted: m.doubt_message_upvotes?.some((v: any) => v.user_id === callerId) ?? false,
            doubt_message_upvotes: undefined
        })) as DoubtMessage[];

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

    async addMessage(threadId: string, senderId: string, content: string): Promise<DoubtMessage & { was_filtered?: boolean }> {
        // Run profanity filter
        const profanityResult = checkProfanity(content);
        const finalContent = profanityResult.cleaned;
        let wasFiltered = false;

        if (profanityResult.isProfane) {
            wasFiltered = true;

            // Get the thread's course_id for violation scoping
            const { data: thread } = await this.supabase
                .from("doubt_threads")
                .select("course_id")
                .eq("id", threadId)
                .single();

            if (thread) {
                const violationsService = new ViolationsService(this.supabase);
                await violationsService.logViolation(
                    senderId,
                    thread.course_id,
                    "profanity",
                    1,
                    profanityResult.original
                );
            }
        }

        const { data: message, error } = await this.supabase
            .from("doubt_messages")
            .insert({
                thread_id: threadId,
                sender_id: senderId,
                content: finalContent,
            })
            .select("*")
            .single();

        if (error) throw error;
        return { ...(message as DoubtMessage), was_filtered: wasFiltered };
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

    async upvoteThread(threadId: string, userId: string): Promise<number> {
        const { data: existing } = await this.supabase
            .from("doubt_thread_upvotes")
            .select("id")
            .eq("thread_id", threadId)
            .eq("user_id", userId)
            .single();

        let upvoteChange = 0;
        if (existing) {
            await this.supabase.from("doubt_thread_upvotes").delete().eq("id", existing.id);
            upvoteChange = -1;
        } else {
            await this.supabase.from("doubt_thread_upvotes").insert({ thread_id: threadId, user_id: userId });
            upvoteChange = 1;
        }

        const { data: thread, error: rpcError } = await this.supabase
            .rpc('increment_doubt_thread_upvotes', { thread_row_id: threadId, change_val: upvoteChange });

        // If the RPC isn't defined, fallback to manual update using typical subquery pattern
        // But for simplicity, we can just fetch and update
        if (rpcError) {
            const { data: curr } = await this.supabase.from("doubt_threads").select("upvote_count").eq("id", threadId).single();
            const newCount = (curr?.upvote_count ?? 0) + upvoteChange;
            await this.supabase.from("doubt_threads").update({ upvote_count: newCount }).eq("id", threadId);
            return newCount;
        }

        return typeof thread === "number" ? thread : 0;
    }

    async upvoteMessage(messageId: string, userId: string): Promise<number> {
        const { data: existing } = await this.supabase
            .from("doubt_message_upvotes")
            .select("id")
            .eq("message_id", messageId)
            .eq("user_id", userId)
            .single();

        let upvoteChange = 0;
        if (existing) {
            await this.supabase.from("doubt_message_upvotes").delete().eq("id", existing.id);
            upvoteChange = -1;
        } else {
            await this.supabase.from("doubt_message_upvotes").insert({ message_id: messageId, user_id: userId });
            upvoteChange = 1;
        }

        const { data: curr } = await this.supabase.from("doubt_messages").select("upvote_count").eq("id", messageId).single();
        const newCount = (curr?.upvote_count ?? 0) + upvoteChange;
        await this.supabase.from("doubt_messages").update({ upvote_count: newCount }).eq("id", messageId);
        return newCount;
    }
}
