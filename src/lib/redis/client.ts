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

    const redisCliAuth = getEnvVar("REDISCLI_AUTH");

    if (!redisCliAuth) {
        throw new Error("REDISCLI_AUTH environment variable is required");
    }

    // REDISCLI_AUTH should contain the full connection URL
    // Format: redis://host:port or rediss://host:port (with TLS)
    // Or with authentication: redis://username:password@host:port
    if (!redisCliAuth.startsWith('redis://') && !redisCliAuth.startsWith('rediss://')) {
        throw new Error("REDISCLI_AUTH must contain a full Redis URL starting with redis:// or rediss://");
    }

    // Validate URL format - ensure it has host and port
    let url: URL;
    try {
        url = new URL(redisCliAuth);
    } catch (error) {
        if (error instanceof TypeError) {
            // URL parsing failed
            throw new Error(`REDISCLI_AUTH contains an invalid URL format: ${error.message}`);
        }
        throw error;
    }
    
    // Check that hostname is present
    if (!url.hostname || url.hostname.trim() === '') {
        throw new Error("REDISCLI_AUTH URL is missing hostname");
    }
    
    // Check that port is present
    // We require explicit port to avoid ambiguity
    if (!url.port || url.port.trim() === '') {
        throw new Error("REDISCLI_AUTH URL is missing port number. Format: redis://host:port or rediss://host:port");
    }
    
    // Validate port is a number
    const portNum = parseInt(url.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error(`REDISCLI_AUTH URL has invalid port number: ${url.port}`);
    }

    redis = createClient({
        url: redisCliAuth,
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

