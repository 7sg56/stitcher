import { Queue } from "bullmq";
import IORedis from "ioredis";

let sessionAggregationQueue: Queue | null = null;

function getRedisConnection(): IORedis | null {
    const host = process.env.UPSTASH_REDIS_HOST;
    const port = parseInt(process.env.UPSTASH_REDIS_PORT || "6379", 10);
    const password = process.env.UPSTASH_REDIS_PASSWORD;

    if (!host) return null;

    return new IORedis({
        host,
        port,
        password: password || undefined,
        tls: {},
        maxRetriesPerRequest: null,
    });
}

export function getSessionAggregationQueue(): Queue | null {
    if (sessionAggregationQueue) return sessionAggregationQueue;

    const connection = getRedisConnection();
    if (!connection) return null;

    sessionAggregationQueue = new Queue("session-aggregation", {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        },
    });

    return sessionAggregationQueue;
}

export async function enqueueSessionAggregation(sessionId: string): Promise<boolean> {
    const queue = getSessionAggregationQueue();
    if (!queue) {
        console.warn("Redis not configured -- skipping session aggregation for", sessionId);
        return false;
    }

    await queue.add("AGGREGATE_SESSION", { sessionId }, {
        jobId: `aggregate-${sessionId}`, // Prevents duplicate jobs for same session
    });

    return true;
}
