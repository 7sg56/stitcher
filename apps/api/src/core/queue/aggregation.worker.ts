import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface AggregateSessionData {
    sessionId: string;
}

function createSupabaseClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_KEY!;
    return createClient(url, key);
}

/**
 * Core aggregation logic -- exported so it can be called directly as a
 * synchronous fallback when BullMQ/Redis is unavailable.
 */
export async function aggregateSession(sessionId: string, supabase?: SupabaseClient): Promise<void> {
    const db = supabase ?? createSupabaseClient();

    // Upsert job record (reset to processing on each run so late-feedback re-runs work)
    const { data: existingJob } = await db
        .from("aggregation_jobs")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

    if (existingJob) {
        await db
            .from("aggregation_jobs")
            .update({ status: "processing" })
            .eq("id", existingJob.id);
    } else {
        await db
            .from("aggregation_jobs")
            .insert({ session_id: sessionId, status: "processing" });
    }

    try {
        // Get session details
        const { data: session } = await db
            .from("sessions")
            .select("id, course_id, teacher_id")
            .eq("id", sessionId)
            .single();

        if (!session) throw new Error(`Session ${sessionId} not found`);

        // Collect all feedback for this session
        const { data: feedbacks } = await db
            .from("feedback")
            .select("id, rating")
            .eq("session_id", sessionId);

        const feedbackItems = feedbacks ?? [];

        if (feedbackItems.length === 0) {
            // No feedback -- still mark as done with empty insights
            await db
                .from("aggregation_jobs")
                .update({ status: "done", completed_at: new Date().toISOString() })
                .eq("session_id", sessionId);

            await db
                .from("session_insights")
                .upsert({
                    session_id: sessionId,
                    weak_concepts: [],
                    quiz_accuracy_pct: null,
                    avg_rating: null,
                    total_feedback: 0,
                    aggregated_at: new Date().toISOString(),
                }, { onConflict: "session_id" });

            return;
        }

        // Calculate plain average rating
        const sumRatings = feedbackItems.reduce((sum, fb) => sum + fb.rating, 0);
        const avgRating = Math.round((sumRatings / feedbackItems.length) * 100) / 100;

        // Upsert teacher_ratings (rolling average across sessions)
        const { data: existingRating } = await db
            .from("teacher_ratings")
            .select("id, weighted_avg_rating, total_reviews")
            .eq("teacher_id", session.teacher_id)
            .eq("course_id", session.course_id)
            .single();

        if (existingRating) {
            const prevTotal = existingRating.total_reviews;
            const prevAvg = parseFloat(String(existingRating.weighted_avg_rating));
            const newTotal = prevTotal + feedbackItems.length;
            const newAvg = ((prevAvg * prevTotal) + (avgRating * feedbackItems.length)) / newTotal;
            const roundedAvg = Math.round(newAvg * 100) / 100;

            const isFlagged = roundedAvg < 2.5 && newTotal >= 5;

            await db
                .from("teacher_ratings")
                .update({
                    weighted_avg_rating: roundedAvg,
                    total_reviews: newTotal,
                    is_flagged: isFlagged,
                    last_aggregated_at: new Date().toISOString(),
                })
                .eq("id", existingRating.id);
        } else {
            const isFlagged = avgRating < 2.5 && feedbackItems.length >= 5;

            await db
                .from("teacher_ratings")
                .insert({
                    teacher_id: session.teacher_id,
                    course_id: session.course_id,
                    weighted_avg_rating: avgRating,
                    total_reviews: feedbackItems.length,
                    is_flagged: isFlagged,
                    last_aggregated_at: new Date().toISOString(),
                });
        }

        // Insert session_insights
        await db
            .from("session_insights")
            .upsert({
                session_id: sessionId,
                weak_concepts: [],
                quiz_accuracy_pct: null,
                avg_rating: avgRating,
                total_feedback: feedbackItems.length,
                aggregated_at: new Date().toISOString(),
            }, { onConflict: "session_id" });

        // Mark job done
        await db
            .from("aggregation_jobs")
            .update({ status: "done", completed_at: new Date().toISOString() })
            .eq("session_id", sessionId);

        console.log(`Session ${sessionId} aggregation complete: avg=${avgRating}, feedback=${feedbackItems.length}`);

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await db
            .from("aggregation_jobs")
            .update({ status: "failed", error: errorMsg })
            .eq("session_id", sessionId);
        throw err;
    }
}

async function processSessionAggregation(job: Job<AggregateSessionData>) {
    await aggregateSession(job.data.sessionId);
}

export function startAggregationWorker(): Worker | null {
    const host = process.env.UPSTASH_REDIS_HOST;
    const port = parseInt(process.env.UPSTASH_REDIS_PORT || "6379", 10);
    const password = process.env.UPSTASH_REDIS_PASSWORD;

    if (!host) {
        console.warn("UPSTASH_REDIS_HOST not set -- aggregation worker disabled");
        return null;
    }

    const connection = new IORedis({
        host,
        port,
        password: password || undefined,
        tls: {},
        family: 4,
        maxRetriesPerRequest: null,
    });

    const worker = new Worker<AggregateSessionData>(
        "session-aggregation",
        processSessionAggregation,
        {
            connection,
            concurrency: 2,
            limiter: {
                max: 5,
                duration: 10000,
            },
        }
    );

    worker.on("completed", (job) => {
        console.log(`Aggregation job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`Aggregation job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
        console.error("Aggregation worker Redis error:", err.message);
    });

    console.log("Session aggregation worker started");
    return worker;
}
