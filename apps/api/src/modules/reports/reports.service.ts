import { SupabaseClient } from "@supabase/supabase-js";
import { Report, ReportWithDetails } from "../../types/database";
import { classifyContent } from "../../core/utils/ai-moderator";
import { ViolationsService } from "../violations/violations.service";
import { SubmitReportInput } from "./reports.schema";

export class ReportsService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Submit a report against a thread or message.
     * Fetches the original content, runs AI classification,
     * and if flagged: deletes content, logs violation, deducts attendance.
     */
    async submitReport(
        reporterId: string,
        data: SubmitReportInput
    ): Promise<Report & { action_taken: string }> {
        // 1. Fetch the original content text + offender ID
        let contentText = "";
        let offenderId = "";
        let courseId = data.course_id;

        if (data.content_type === "thread") {
            const { data: thread } = await this.supabase
                .from("doubt_threads")
                .select("title, created_by, course_id")
                .eq("id", data.content_id)
                .single();
            if (!thread) throw new Error("Thread not found");
            contentText = thread.title;
            offenderId = thread.created_by;
            courseId = thread.course_id;
        } else {
            const { data: message } = await this.supabase
                .from("doubt_messages")
                .select("content, sender_id, thread_id")
                .eq("id", data.content_id)
                .single();
            if (!message) throw new Error("Message not found");
            contentText = message.content;
            offenderId = message.sender_id;

            // Get course_id from the thread
            const { data: thread } = await this.supabase
                .from("doubt_threads")
                .select("course_id")
                .eq("id", message.thread_id)
                .single();
            if (thread) courseId = thread.course_id;
        }

        // 2. Run AI classification
        const aiResult = await classifyContent(contentText);

        // 3. Insert report record
        const { data: report, error } = await this.supabase
            .from("reports")
            .insert({
                reporter_id: reporterId,
                course_id: courseId,
                content_type: data.content_type,
                content_id: data.content_id,
                content_text: contentText,
                reason: data.reason ?? null,
                ai_classification: aiResult,
                status: aiResult.isFlagged ? "flagged" : "dismissed",
            })
            .select("*")
            .single();

        if (error) throw error;

        let actionTaken = "dismissed";

        // 4. If flagged: delete content + log violation + deduct attendance
        if (aiResult.isFlagged) {
            actionTaken = "flagged_and_deleted";

            // Delete the offending content
            if (data.content_type === "thread") {
                // Delete all messages in the thread first
                await this.supabase
                    .from("doubt_messages")
                    .delete()
                    .eq("thread_id", data.content_id);
                // Delete thread upvotes
                await this.supabase
                    .from("doubt_thread_upvotes")
                    .delete()
                    .eq("thread_id", data.content_id);
                // Delete the thread
                await this.supabase
                    .from("doubt_threads")
                    .delete()
                    .eq("id", data.content_id);
            } else {
                // Delete message upvotes
                await this.supabase
                    .from("doubt_message_upvotes")
                    .delete()
                    .eq("message_id", data.content_id);
                // Delete the message
                await this.supabase
                    .from("doubt_messages")
                    .delete()
                    .eq("id", data.content_id);
            }

            // Log violation
            const violationsService = new ViolationsService(this.supabase);
            await violationsService.logViolation(
                offenderId,
                courseId,
                aiResult.category,
                1,
                contentText
            );
        }

        return { ...(report as Report), action_taken: actionTaken };
    }

    /**
     * Get all reports for a course (admin/teacher view).
     * Enriched with reporter and offender alias names.
     */
    async getReportsByCourse(courseId: string): Promise<ReportWithDetails[]> {
        const { data: reports, error } = await this.supabase
            .from("reports")
            .select("*")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        if (!reports || reports.length === 0) return [];

        // Collect all user IDs we need aliases for
        const userIds = new Set<string>();
        for (const r of reports) {
            userIds.add(r.reporter_id);
        }

        // We also need offender IDs from the content
        // For efficiency, we stored content_text but not offender_id in the report.
        // Let's look up offender from threads/messages that still exist
        const threadIds = reports
            .filter((r: Report) => r.content_type === "thread")
            .map((r: Report) => r.content_id);
        const messageIds = reports
            .filter((r: Report) => r.content_type === "message")
            .map((r: Report) => r.content_id);

        const offenderMap: Record<string, string> = {};

        if (threadIds.length > 0) {
            const { data: threads } = await this.supabase
                .from("doubt_threads")
                .select("id, created_by")
                .in("id", threadIds);
            for (const t of threads ?? []) {
                offenderMap[t.id] = t.created_by;
                userIds.add(t.created_by);
            }
        }

        if (messageIds.length > 0) {
            const { data: messages } = await this.supabase
                .from("doubt_messages")
                .select("id, sender_id")
                .in("id", messageIds);
            for (const m of messages ?? []) {
                offenderMap[m.id] = m.sender_id;
                userIds.add(m.sender_id);
            }
        }

        // Fetch aliases
        const { data: aliases } = await this.supabase
            .from("aliases")
            .select("user_id, display_name")
            .in("user_id", [...userIds])
            .eq("is_active", true);

        const aliasMap = Object.fromEntries(
            (aliases ?? []).map((a: { user_id: string; display_name: string }) => [
                a.user_id,
                a.display_name,
            ])
        );

        return (reports as Report[]).map((r) => {
            const offId = offenderMap[r.content_id] ?? null;
            return {
                ...r,
                reporter_alias: aliasMap[r.reporter_id] ?? null,
                offender_id: offId,
                offender_alias: offId ? (aliasMap[offId] ?? null) : null,
            };
        });
    }
}
