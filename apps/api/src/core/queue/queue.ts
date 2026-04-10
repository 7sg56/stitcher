import { Queue } from "bullmq";
import IORedis from "ioredis";
import { aggregateSession } from "./aggregation.worker";

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

/**
 * Enqueue a session aggregation job. If Redis/BullMQ is unavailable or
 * the enqueue fails, falls back to running aggregation synchronously
 * so teacher ratings are always computed.
 */
export async function enqueueSessionAggregation(sessionId: string): Promise<boolean> {
    const queue = getSessionAggregationQueue();

    if (!queue) {
        // Redis not configured -- run aggregation synchronously
        console.log(`Redis not configured -- running aggregation synchronously for session ${sessionId}`);
        await aggregateSession(sessionId);
        return true;
    }

    try {
        await queue.add("AGGREGATE_SESSION", { sessionId }, {
            jobId: `aggregate-${sessionId}-${Date.now()}`,
            delay: 15_000,
        });
        return true;
    } catch (err) {
        // BullMQ enqueue failed -- fall back to synchronous aggregation
        console.error(`BullMQ enqueue failed for session ${sessionId}, running synchronously:`, err);
        await aggregateSession(sessionId);
        return true;
    }
}
