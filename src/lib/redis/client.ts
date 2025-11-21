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
    const redisCliAuth = getEnvVar("REDISCLI_AUTH"); // Optional: used by Render.com CLI, can contain password or username:password

    if (!redisUrl) {
        throw new Error("REDIS_URL environment variable is required");
    }

    // Render.com internal Redis uses redis:// without TLS
    // Keep the URL as-is (no TLS conversion needed for Render internal Redis)
    let url = redisUrl;

    // If URL doesn't contain credentials and REDISCLI_AUTH is provided, add credentials to URL
    // REDISCLI_AUTH can be just password or username:password
    if (redisCliAuth && !url.includes('@') && !url.includes('://:')) {
        // Check if REDISCLI_AUTH contains username:password or just password
        const authParts = redisCliAuth.includes(':') ? redisCliAuth.split(':') : [null, redisCliAuth];
        const [authUsername, authPassword] = authParts;
        
        // Insert credentials into URL: redis://host:port -> redis://username:password@host:port
        const urlMatch = url.match(/^(redis[s]?:\/\/)([^\/]+)$/);
        if (urlMatch) {
            const protocol = urlMatch[1];
            const hostPort = urlMatch[2];
            if (authUsername) {
                url = `${protocol}${authUsername}:${authPassword}@${hostPort}`;
            } else {
                url = `${protocol}:${authPassword}@${hostPort}`;
            }
        }
    }

    redis = createClient({
        url: url,
    });

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

