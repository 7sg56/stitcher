import fp from "fastify-plugin";
import IORedis from "ioredis";
import { FastifyInstance } from "fastify";

declare module "fastify" {
    interface FastifyInstance {
        redis: IORedis;
    }
}

export default fp(async (fastify: FastifyInstance) => {
    const host = process.env.UPSTASH_REDIS_HOST;
    const port = parseInt(process.env.UPSTASH_REDIS_PORT || "6379", 10);
    const password = process.env.UPSTASH_REDIS_PASSWORD;

    if (!host) {
        fastify.log.warn("UPSTASH_REDIS_HOST not set -- Redis features disabled");
        return;
    }

    const redis = new IORedis({
        host,
        port,
        password: password || undefined,
        tls: {},
        family: 4,
        maxRetriesPerRequest: null, // Required by BullMQ
    });

    redis.on("error", (err) => {
        fastify.log.error({ err }, "Redis connection error");
    });

    redis.on("connect", () => {
        fastify.log.info("Connected to Upstash Redis");
    });

    fastify.decorate("redis", redis);

    fastify.addHook("onClose", async () => {
        await redis.quit();
    });
});
