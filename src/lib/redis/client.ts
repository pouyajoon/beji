import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
    if (redis) {
        return redis;
    }

    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
    const redisUsername = process.env.REDIS_USERNAME;
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisTls = process.env.REDIS_TLS === "true";

    if (redisUrl) {
        redis = new Redis(redisUrl, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });
    } else {
        redis = new Redis({
            host: redisHost,
            port: redisPort,
            username: redisUsername,
            password: redisPassword,
            tls: redisTls ? {} : undefined,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });
    }

    redis.on("error", (err) => {
        console.error("Redis Client Error:", err);
    });

    redis.on("connect", () => {
        console.log("Redis Client Connected");
    });

    return redis;
}

export function closeRedisClient(): void {
    if (redis) {
        redis.disconnect();
        redis = null;
    }
}

