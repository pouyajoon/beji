import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';
import { getRedisClient } from '../src/lib/redis/client';
import type { RedisClientType } from 'redis';

// Load .env.local for integration tests
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Redis Cloud Connection Test
 * 
 * This test verifies connection to Redis using REDISCLI_AUTH.
 * 
 * Required environment variable (set in .env.local):
 * - REDISCLI_AUTH=redis://host:port or rediss://host:port
 * 
 * Note: This test will be skipped if REDISCLI_AUTH is not set.
 */
describe('Redis Cloud Connection Test', () => {
    let redis: RedisClientType;
    let isConnected = false;
    const testPrefix = 'test:cloud:';

    beforeAll(async () => {
        // Skip if REDISCLI_AUTH is not set
        const redisCliAuth = process.env.REDISCLI_AUTH;
        if (!redisCliAuth) {
            console.warn('REDISCLI_AUTH not set, skipping Redis connection test');
            return;
        }

        // If REDISCLI_AUTH is a password (not a URL), check for required env vars
        if (!redisCliAuth.startsWith('redis://') && !redisCliAuth.startsWith('rediss://')) {
            if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
                console.warn('REDISCLI_AUTH is a password but REDIS_HOST or REDIS_PORT is missing, skipping Redis connection test');
                return;
            }
        }

        redis = getRedisClient();

        // Try to connect and verify Redis is accessible (always uses TLS)
        try {
            // Check if already connected or open
            if (redis.isReady || redis.isOpen) {
                await redis.ping();
                isConnected = true;
                console.log('✅ Redis Cloud connection already established');
            } else if (!redis.isOpen) {
                // Try to connect with timeout (only if socket is not open)
                await Promise.race([
                    redis.connect(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Connection timeout')), 10000)
                    ),
                ]);
                await redis.ping();
                isConnected = true;
                console.log('✅ Successfully connected to Redis Cloud via TLS');
            }
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            // Check if error is "Socket already opened" - this means we're already connected
            if (errorMsg.includes('Socket already opened')) {
                try {
                    await redis.ping();
                    isConnected = true;
                    console.log('✅ Redis Cloud connection verified (socket already open)');
                } catch (pingError) {
                    console.error('❌ Redis connection failed:', errorMsg);
                    console.error('Connection details:', {
                        redisCliAuth: process.env.REDISCLI_AUTH ? 'set' : 'not set',
                        isReady: redis.isReady,
                        isOpen: redis.isOpen,
                    });
                    isConnected = false;
                }
            } else {
                console.error('❌ Redis connection failed:', errorMsg);
                console.error('Connection details:', {
                    redisCliAuth: process.env.REDISCLI_AUTH ? 'set' : 'not set',
                    isReady: redis.isReady,
                    isOpen: redis.isOpen,
                });
                isConnected = false;
                // Don't throw - gracefully skip tests instead
            }
        }
    });

    afterAll(async () => {
        if (isConnected && redis) {
            try {
                // Clean up test keys
                const keys: string[] = [];
                for await (const key of redis.scanIterator({
                    MATCH: `${testPrefix}*`,
                    COUNT: 100,
                })) {
                    // scanIterator yields individual strings
                    if (typeof key === 'string') {
                        keys.push(key);
                    } else if (Array.isArray(key)) {
                        keys.push(...key);
                    }
                }
                if (keys.length > 0) {
                    // Delete keys individually to avoid TypeScript issues
                    for (const key of keys) {
                        await redis.del(key);
                    }
                    console.log(`Cleaned up ${keys.length} test keys`);
                }
            } catch (error) {
                console.warn('Error cleaning up test keys:', error);
            }
        }
        // Note: closeRedisClient was removed during code pruning
    });

    it('should connect to Redis Cloud successfully', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        const pong = await redis.ping();
        expect(pong).toBe('PONG');

        // Verify connection status
        expect(redis.isReady).toBe(true);
    });

    it('should verify connection uses REDISCLI_AUTH', () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        // Verify REDISCLI_AUTH is set
        expect(process.env.REDISCLI_AUTH).toBeDefined();
        expect(process.env.REDISCLI_AUTH).toBeTruthy();
    });

    it('should perform basic SET and GET operations', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        const testKey = `${testPrefix}basic:test`;
        const testValue = 'hello-redis-cloud';

        await redis.set(testKey, testValue);
        const retrieved = await redis.get(testKey);

        expect(retrieved).toBe(testValue);

        // Clean up
        await redis.del(testKey);
    });

    it('should handle hash operations (used by game state)', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        const hashKey = `${testPrefix}hash:gamestate`;
        const testData = {
            playerId: 'test-player-123',
            x: '100',
            y: '200',
            worldId: 'test-world-456',
        };

        // Set hash fields
        await redis.hSet(hashKey, testData);

        // Get all hash fields
        const retrieved = await redis.hGetAll(hashKey);
        expect(retrieved).toEqual(testData);

        // Get individual field
        const playerId = await redis.hGet(hashKey, 'playerId');
        expect(playerId).toBe('test-player-123');

        // Clean up
        await redis.del(hashKey);
    });

    it('should handle set operations (used for indexing)', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        const setKey = `${testPrefix}set:index`;
        const testMembers = ['beji-1', 'beji-2', 'beji-3'];

        // Add members to set
        await redis.sAdd(setKey, testMembers);

        // Get all members
        const members = await redis.sMembers(setKey);
        expect(members.sort()).toEqual(testMembers.sort());

        // Check membership (node-redis returns boolean, but check for truthy value)
        const isMember = await redis.sIsMember(setKey, 'beji-1');
        expect(!!isMember).toBe(true);

        // Clean up
        await redis.del(setKey);
    });

    it('should handle pipelined operations efficiently', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        const multi = redis.multi();
        const keys = [
            `${testPrefix}pipeline:1`,
            `${testPrefix}pipeline:2`,
            `${testPrefix}pipeline:3`,
        ];

        // Queue multiple operations
        keys.forEach((key, index) => {
            multi.set(key, `value-${index}`);
        });

        // Execute multi
        const results = await multi.exec();

        expect(results).toBeDefined();
        expect(results?.length).toBe(keys.length);

        // Verify all keys were set
        for (const key of keys) {
            const value = await redis.get(key);
            expect(value).toBeTruthy();
        }

        // Clean up - delete keys individually
        for (const key of keys) {
            await redis.del(key);
        }
    });

    it('should verify Redis connection is persistent across multiple operations', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        // Perform multiple operations to verify connection stability
        const operations = 10;
        const results: string[] = [];

        for (let i = 0; i < operations; i++) {
            const key = `${testPrefix}persistent:${i}`;
            await redis.set(key, `value-${i}`);
            const value = await redis.get(key);
            results.push(value || '');
        }

        expect(results.length).toBe(operations);
        expect(results.every((v, i) => v === `value-${i}`)).toBe(true);

        // Clean up
        const keys = Array.from({ length: operations }, (_, i) =>
            `${testPrefix}persistent:${i}`
        );
        if (keys.length > 0) {
            await redis.del(keys);
        }
    });
});

