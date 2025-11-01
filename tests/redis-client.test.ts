import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type Redis from 'ioredis';

// Mock ioredis before importing
vi.mock('ioredis', () => {
    const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        sadd: vi.fn(),
        smembers: vi.fn(),
        pipeline: vi.fn(() => ({
            set: vi.fn().mockReturnThis(),
            sadd: vi.fn().mockReturnThis(),
            exec: vi.fn(),
        })),
        disconnect: vi.fn(),
        on: vi.fn(),
    };

    return {
        default: vi.fn(() => mockRedis),
    };
});

describe('Redis Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear module cache to get fresh mocks
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates Redis client with URL when REDIS_URL is set', async () => {
        const originalEnv = process.env.REDIS_URL;
        process.env.REDIS_URL = 'redis://localhost:6379';

        const Redis = (await import('ioredis')).default;
        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', {
            retryStrategy: expect.any(Function),
            maxRetriesPerRequest: 3,
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

        const Redis = (await import('ioredis')).default;
        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(Redis).toHaveBeenCalledWith({
            host: 'custom-host',
            port: 6380,
            username: undefined,
            password: undefined,
            tls: undefined,
            retryStrategy: expect.any(Function),
            maxRetriesPerRequest: 3,
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
        process.env.REDIS_TLS = 'true';

        const Redis = (await import('ioredis')).default;
        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(Redis).toHaveBeenCalledWith({
            host: 'redis-cloud.example.com',
            port: 12901,
            username: 'default',
            password: 'secure-password',
            tls: {},
            retryStrategy: expect.any(Function),
            maxRetriesPerRequest: 3,
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

        const Redis = (await import('ioredis')).default;
        const { getRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();

        expect(Redis).toHaveBeenCalledWith({
            host: 'localhost',
            port: 6379,
            username: undefined,
            password: undefined,
            tls: undefined,
            retryStrategy: expect.any(Function),
            maxRetriesPerRequest: 3,
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
        const Redis = (await import('ioredis')).default;
        const mockInstance = new Redis();
        const { getRedisClient, closeRedisClient } = await import('../src/lib/redis/client');

        getRedisClient();
        closeRedisClient();

        expect(mockInstance.disconnect).toHaveBeenCalled();
    });
});

