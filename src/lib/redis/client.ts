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
    const redisHost = getEnvVar("REDIS_HOST");
    const redisPort = getEnvVar("REDIS_PORT");
    const redisUsername = getEnvVar("REDIS_USERNAME");

    if (!redisCliAuth) {
        throw new Error("REDISCLI_AUTH environment variable is required");
    }

    let connectionUrl: string;

    // Check if REDISCLI_AUTH is a full URL (starts with redis:// or rediss://)
    if (redisCliAuth.startsWith('redis://') || redisCliAuth.startsWith('rediss://')) {
        // It's a full URL - use it directly
        connectionUrl = redisCliAuth;
        
        // Validate URL format
        let url: URL;
        try {
            url = new URL(connectionUrl);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error(`REDISCLI_AUTH contains an invalid URL format: ${error.message}`);
            }
            throw error;
        }
        
        // Check that hostname is present
        if (!url.hostname || url.hostname.trim() === '') {
            throw new Error("REDISCLI_AUTH URL is missing hostname");
        }
        
        // Check that port is present
        if (!url.port || url.port.trim() === '') {
            throw new Error("REDISCLI_AUTH URL is missing port number. Format: redis://host:port or rediss://host:port");
        }
        
        // Validate port is a number
        const portNum = parseInt(url.port, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            throw new Error(`REDISCLI_AUTH URL has invalid port number: ${url.port}`);
        }
    } else {
        // REDISCLI_AUTH is just the password - construct URL from other env vars
        // Render Key Value provides: REDISCLI_AUTH (password), REDIS_HOST, REDIS_PORT, REDIS_USERNAME
        if (!redisHost) {
            throw new Error("REDIS_HOST environment variable is required when REDISCLI_AUTH is a password");
        }
        if (!redisPort) {
            throw new Error("REDIS_PORT environment variable is required when REDISCLI_AUTH is a password");
        }

        // Validate port is a number
        const portNum = parseInt(redisPort, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            throw new Error(`REDIS_PORT has invalid port number: ${redisPort}`);
        }

        // Render Key Value uses TLS, so use rediss://
        // Construct URL: rediss://username:password@host:port or rediss://password@host:port
        const authPart = redisUsername 
            ? `${encodeURIComponent(redisUsername)}:${encodeURIComponent(redisCliAuth)}@`
            : `${encodeURIComponent(redisCliAuth)}@`;
        
        connectionUrl = `rediss://${authPart}${redisHost}:${redisPort}`;
    }

    redis = createClient({
        url: connectionUrl,
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

