import { createClient, type RedisClientType } from "redis";

let redis: RedisClientType | null = null;

// Helper function to get env vars at runtime only, preventing Next.js build-time analysis
function getEnvVar(key: string): string | undefined {
    // Access via bracket notation to prevent static analysis
    return process.env[key];
}

export function getRedisClient(): RedisClientType {
    if (redis) {
        return redis;
    }

    const redisUrl = getEnvVar("REDIS_URL");
    const redisHost = getEnvVar("REDIS_HOST") || "localhost";
    const redisPort = parseInt(getEnvVar("REDIS_PORT") || "6379", 10);
    const redisUsername = getEnvVar("REDIS_USERNAME");
    const redisPassword = getEnvVar("REDIS_PASSWORD");

    if (redisUrl) {
        // If URL uses rediss://, TLS is automatically enabled
        // If URL uses redis://, we need to force TLS
        const url = redisUrl.startsWith('rediss://')
            ? redisUrl
            : redisUrl.replace('redis://', 'rediss://');
        redis = createClient({
            url: url,
        });
    } else {
        // TLS configuration for Redis Cloud
        // Note: redis socket.tls is typed as boolean | undefined, but accepts TLS options object at runtime
        // This is a known limitation of the redis package types
        redis = createClient({
            socket: {
                host: redisHost,
                port: redisPort,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tls: {
                    rejectUnauthorized: false, // For Redis Cloud TLS
                } as any as boolean,
            } as any,
            username: redisUsername,
            password: redisPassword,
        });
    }

    redis.on("error", (err) => {
        console.error("Redis Client Error:", err);
    });

    redis.on("connect", () => {
        console.log("Redis Client Connected");
    });

    // Connect to Redis (lazy connection, will connect on first command if not already connected)
    if (!redis.isOpen) {
        redis.connect().catch((err) => {
            console.error("Failed to connect to Redis:", err);
        });
    }

    return redis;
}

