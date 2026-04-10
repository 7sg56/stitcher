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

async function processSessionAggregation(job: Job<AggregateSessionData>) {
    const { sessionId } = job.data;
    const supabase = createSupabaseClient();

    // 1. Idempotency check
    const { data: existingJob } = await supabase
        .from("aggregation_jobs")
        .select("id, status")
        .eq("session_id", sessionId)
        .single();

    if (existingJob?.status === "done") {
        console.log(`Session ${sessionId} already aggregated, skipping`);
        return;
    }

    // Upsert job record
    if (existingJob) {
        await supabase
            .from("aggregation_jobs")
            .update({ status: "processing" })
            .eq("id", existingJob.id);
    } else {
        await supabase
            .from("aggregation_jobs")
            .insert({ session_id: sessionId, status: "processing" });
    }

    try {
        // 2. Get session details
        const { data: session } = await supabase
            .from("sessions")
            .select("id, course_id, teacher_id")
            .eq("id", sessionId)
            .single();

        if (!session) throw new Error(`Session ${sessionId} not found`);

        // 3. Collect all feedback for this session
        const { data: feedbacks } = await supabase
            .from("feedback")
            .select("id, rating")
            .eq("session_id", sessionId);

        const feedbackItems = feedbacks ?? [];

        if (feedbackItems.length === 0) {
            // No feedback -- still mark as done with empty insights
            await supabase
                .from("aggregation_jobs")
                .update({ status: "done", completed_at: new Date().toISOString() })
                .eq("session_id", sessionId);

            await supabase
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

        // 4. Calculate plain average rating
        const sumRatings = feedbackItems.reduce((sum, fb) => sum + fb.rating, 0);
        const avgRating = Math.round((sumRatings / feedbackItems.length) * 100) / 100;

        // 5. Upsert teacher_ratings (rolling average across sessions)
        const { data: existingRating } = await supabase
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

            await supabase
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

            await supabase
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

        // 6. Insert session_insights
        await supabase
            .from("session_insights")
            .upsert({
                session_id: sessionId,
                weak_concepts: [],
                quiz_accuracy_pct: null,
                avg_rating: avgRating,
                total_feedback: feedbackItems.length,
                aggregated_at: new Date().toISOString(),
            }, { onConflict: "session_id" });

        // 7. Mark job done
        await supabase
            .from("aggregation_jobs")
            .update({ status: "done", completed_at: new Date().toISOString() })
            .eq("session_id", sessionId);

        console.log(`Session ${sessionId} aggregation complete: avg=${avgRating}, feedback=${feedbackItems.length}`);

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await supabase
            .from("aggregation_jobs")
            .update({ status: "failed", error: errorMsg })
            .eq("session_id", sessionId);
        throw err;
    }
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

    console.log("Session aggregation worker started");
    return worker;
}
