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

    it('creates Redis client with Render Redis URL (no TLS)', async () => {
        const originalEnv = process.env.REDIS_URL;
        process.env.REDIS_URL = 'redis://red-d4g9n4hr0fns739f93vg:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        // Render Redis URLs are kept as redis:// (no TLS conversion)
        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'redis://red-d4g9n4hr0fns739f93vg:6379',
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

    it('throws error when REDIS_URL is not set', async () => {
        const originalEnv = process.env.REDIS_URL;
        delete process.env.REDIS_URL;

        const { getRedisClient } = await import('../src/lib/redis/client');

        expect(() => getRedisClient()).toThrow('REDIS_URL environment variable is required');

        process.env.REDIS_URL = originalEnv;
    });

    it('adds credentials from REDISCLI_AUTH to URL when not in URL', async () => {
        const originalUrl = process.env.REDIS_URL;
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDIS_URL = 'redis://red-xxxxx:6379';
        process.env.REDISCLI_AUTH = 'mypassword';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'redis://:mypassword@red-xxxxx:6379',
        });

        process.env.REDIS_URL = originalUrl;
        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('adds username:password from REDISCLI_AUTH to URL', async () => {
        const originalUrl = process.env.REDIS_URL;
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDIS_URL = 'redis://red-xxxxx:6379';
        process.env.REDISCLI_AUTH = 'username:mypassword';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'redis://username:mypassword@red-xxxxx:6379',
        });

        process.env.REDIS_URL = originalUrl;
        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('returns same Redis client instance on subsequent calls', async () => {
        const { getRedisClient } = await import('../src/lib/redis/client');

        const client1 = getRedisClient();
        const client2 = getRedisClient();

        expect(client1).toBe(client2);
    });
});
