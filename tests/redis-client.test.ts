import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { RedisClientType } from 'redis';

// Mock redis before importing
const mockRedisInstance = {
    get: vi.fn(),
    set: vi.fn(),
    sAdd: vi.fn(),
    sMembers: vi.fn(),
    multi: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        sAdd: vi.fn().mockReturnThis(),
        exec: vi.fn(),
    })),
    quit: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    isOpen: false,
    isReady: false,
    on: vi.fn(),
};

const mockCreateClient = vi.fn(() => mockRedisInstance);

vi.mock('redis', () => ({
    createClient: mockCreateClient,
}));

describe('Redis Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules(); // Reset modules to clear Redis singleton
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates Redis client with URL when REDIS_URL is set (converts to TLS)', async () => {
        const originalEnv = process.env.REDIS_URL;
        process.env.REDIS_URL = 'redis://localhost:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        // Client converts redis:// to rediss:// for TLS
        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'rediss://localhost:6379',
        });

        process.env.REDIS_URL = originalEnv;
    });

    it('creates Redis client with rediss:// URL (TLS already)', async () => {
        const originalEnv = process.env.REDIS_URL;
        process.env.REDIS_URL = 'rediss://localhost:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        // rediss:// URLs are passed through as-is
        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'rediss://localhost:6379',
        });

        process.env.REDIS_URL = originalEnv;
    });

    it('creates Redis client with individual parameters when URL is not set', async () => {
        const originalUrl = process.env.REDIS_URL;
        const originalHost = process.env.REDIS_HOST;
        const originalPort = process.env.REDIS_PORT;
        const originalUsername = process.env.REDIS_USERNAME;
        const originalPassword = process.env.REDIS_PASSWORD;
        const originalTls = process.env.REDIS_TLS;

        delete process.env.REDIS_URL;
        process.env.REDIS_HOST = 'custom-host';
        process.env.REDIS_PORT = '6380';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(mockCreateClient).toHaveBeenCalledWith({
            socket: {
                host: 'custom-host',
                port: 6380,
                tls: {
                    rejectUnauthorized: false,
                },
            },
            username: undefined,
            password: undefined,
        });

        process.env.REDIS_URL = originalUrl;
        process.env.REDIS_HOST = originalHost;
        process.env.REDIS_PORT = originalPort;
        process.env.REDIS_USERNAME = originalUsername;
        process.env.REDIS_PASSWORD = originalPassword;
        process.env.REDIS_TLS = originalTls;
    });

    it('creates Redis client with username, password, and TLS for secure connections', async () => {
        const originalUrl = process.env.REDIS_URL;
        const originalHost = process.env.REDIS_HOST;
        const originalPort = process.env.REDIS_PORT;
        const originalUsername = process.env.REDIS_USERNAME;
        const originalPassword = process.env.REDIS_PASSWORD;
        const originalTls = process.env.REDIS_TLS;

        delete process.env.REDIS_URL;
        process.env.REDIS_HOST = 'redis-cloud.example.com';
        process.env.REDIS_PORT = '12901';
        process.env.REDIS_USERNAME = 'default';
        process.env.REDIS_PASSWORD = 'secure-password';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(mockCreateClient).toHaveBeenCalledWith({
            socket: {
                host: 'redis-cloud.example.com',
                port: 12901,
                tls: {
                    rejectUnauthorized: false,
                },
            },
            username: 'default',
            password: 'secure-password',
        });

        process.env.REDIS_URL = originalUrl;
        process.env.REDIS_HOST = originalHost;
        process.env.REDIS_PORT = originalPort;
        process.env.REDIS_USERNAME = originalUsername;
        process.env.REDIS_PASSWORD = originalPassword;
        process.env.REDIS_TLS = originalTls;
    });

    it('uses default localhost:6379 when no env vars are set', async () => {
        const originalUrl = process.env.REDIS_URL;
        const originalHost = process.env.REDIS_HOST;
        const originalPort = process.env.REDIS_PORT;
        const originalUsername = process.env.REDIS_USERNAME;
        const originalPassword = process.env.REDIS_PASSWORD;
        const originalTls = process.env.REDIS_TLS;

        delete process.env.REDIS_URL;
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.REDIS_USERNAME;
        delete process.env.REDIS_PASSWORD;
        delete process.env.REDIS_TLS;

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(mockCreateClient).toHaveBeenCalledWith({
            socket: {
                host: 'localhost',
                port: 6379,
                tls: {
                    rejectUnauthorized: false,
                },
            },
            username: undefined,
            password: undefined,
        });

        process.env.REDIS_URL = originalUrl;
        process.env.REDIS_HOST = originalHost;
        process.env.REDIS_PORT = originalPort;
        process.env.REDIS_USERNAME = originalUsername;
        process.env.REDIS_PASSWORD = originalPassword;
        process.env.REDIS_TLS = originalTls;
    });

    it('returns same Redis client instance on subsequent calls', async () => {
        const { getRedisClient } = await import('../src/lib/redis/client');

        const client1 = getRedisClient();
        const client2 = getRedisClient();

        expect(client1).toBe(client2);
    });

    it('closes Redis client connection', async () => {
        const { getRedisClient, closeRedisClient } = await import('../src/lib/redis/client');

        const client = getRedisClient();
        // Set isOpen to true so quit() is called
        mockRedisInstance.isOpen = true;
        await closeRedisClient();

        expect(mockRedisInstance.quit).toHaveBeenCalled();
    });
});
