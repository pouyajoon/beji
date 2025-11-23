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
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDISCLI_AUTH = 'redis://red-d4g9n4hr0fns739f93vg:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        // Render Redis URLs are kept as redis:// (no TLS conversion)
        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'redis://red-d4g9n4hr0fns739f93vg:6379',
        });

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('creates Redis client with rediss:// URL (TLS already)', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDISCLI_AUTH = 'rediss://localhost:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        // rediss:// URLs are passed through as-is
        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'rediss://localhost:6379',
        });

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('throws error when REDISCLI_AUTH is not set', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        delete process.env.REDISCLI_AUTH;

        const { getRedisClient } = await import('../src/lib/redis/client');

        expect(() => getRedisClient()).toThrow('REDISCLI_AUTH environment variable is required');

        if (originalCliAuth) process.env.REDISCLI_AUTH = originalCliAuth;
    });

    it('throws error when REDISCLI_AUTH does not contain a valid URL', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDISCLI_AUTH = 'invalid-url';

        const { getRedisClient } = await import('../src/lib/redis/client');

        expect(() => getRedisClient()).toThrow('REDISCLI_AUTH must contain a full Redis URL starting with redis:// or rediss://');

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('throws error when REDISCLI_AUTH URL is missing hostname', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDISCLI_AUTH = 'redis://:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        // URL constructor will catch this as invalid URL format
        expect(() => getRedisClient()).toThrow('REDISCLI_AUTH contains an invalid URL format');

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('throws error when REDISCLI_AUTH URL is missing port', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDISCLI_AUTH = 'redis://localhost';

        const { getRedisClient } = await import('../src/lib/redis/client');

        expect(() => getRedisClient()).toThrow('REDISCLI_AUTH URL is missing port number');

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('throws error when REDISCLI_AUTH URL has invalid port', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        // Use a port that's out of valid range (1-65535)
        // Note: Very large ports may be rejected by URL constructor, so test with a port that parses but is invalid
        process.env.REDISCLI_AUTH = 'redis://localhost:0';

        const { getRedisClient } = await import('../src/lib/redis/client');

        expect(() => getRedisClient()).toThrow('REDISCLI_AUTH URL has invalid port number');

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });


    it('creates Redis client with authenticated URL', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDISCLI_AUTH = 'redis://default:password@red-xxxxx:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(mockCreateClient).toHaveBeenCalledWith({
            url: 'redis://default:password@red-xxxxx:6379',
        });

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });

    it('returns same Redis client instance on subsequent calls', async () => {
        const originalCliAuth = process.env.REDISCLI_AUTH;
        process.env.REDISCLI_AUTH = 'redis://test:6379';

        const { getRedisClient } = await import('../src/lib/redis/client');

        const client1 = getRedisClient();
        const client2 = getRedisClient();

        expect(client1).toBe(client2);

        if (originalCliAuth) {
            process.env.REDISCLI_AUTH = originalCliAuth;
        } else {
            delete process.env.REDISCLI_AUTH;
        }
    });
});
