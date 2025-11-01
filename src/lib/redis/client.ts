import { createClient, type RedisClientType } from "redis";

let redis: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
    if (redis) {
        return redis;
    }

    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
    const redisUsername = process.env.REDIS_USERNAME;
    const redisPassword = process.env.REDIS_PASSWORD;

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
        redis = createClient({
            socket: {
                host: redisHost,
                port: redisPort,
                tls: {
                    rejectUnauthorized: false, // For Redis Cloud TLS
                },
            },
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

export async function closeRedisClient(): Promise<void> {
    if (redis) {
        try {
            if (redis.isOpen) {
                await redis.quit();
            }
        } catch (error) {
            // Ignore errors if client is already closed
            console.warn('Error closing Redis client:', error);
        } finally {
            redis = null;
        }
    }
}
