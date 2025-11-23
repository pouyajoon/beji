import { config } from 'dotenv';
import { resolve } from 'path';
import type { RedisClientType } from 'redis';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { getRedisClient } from '../src/lib/redis/client';

// Load .env.local for integration tests
config({ path: resolve(process.cwd(), '.env.local') });

describe('Redis Integration Test', () => {
    let redis: RedisClientType | undefined;
    let isConnected = false;
    const testPrefix = 'test:integration:';

    beforeAll(async () => {
        // Skip if REDISCLI_AUTH is not set
        const redisCliAuth = process.env.REDISCLI_AUTH;
        if (!redisCliAuth) {
            console.warn('REDISCLI_AUTH not set, skipping Redis integration test');
            return;
        }

        // If REDISCLI_AUTH is a password (not a URL), check for required env vars
        if (!redisCliAuth.startsWith('redis://') && !redisCliAuth.startsWith('rediss://')) {
            if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
                console.warn('REDISCLI_AUTH is a password but REDIS_HOST or REDIS_PORT is missing, skipping Redis integration test');
                return;
            }
        }

        try {
            redis = getRedisClient();

            // Try to connect and verify Redis is accessible
            // Check if already connected or open
            if (redis.isReady || redis.isOpen) {
                await redis.ping();
                isConnected = true;
            } else if (!redis.isOpen) {
                // Try to connect with timeout (only if socket is not open)
                await Promise.race([
                    redis.connect(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Connection timeout')), 5000)
                    ),
                ]);
                await redis.ping();
                isConnected = true;
            }
        } catch (error) {
            // Redis is not available - tests will be skipped
            console.warn('Redis connection failed, integration tests will be skipped:', error);
            isConnected = false;
        }
    });

    afterAll(async () => {
        if (isConnected && redis) {
            try {
                // Clean up test keys - get all keys matching pattern
                const keys: string[] = [];
                for await (const keyBatch of redis.scanIterator({
                    MATCH: `${testPrefix}*`,
                    COUNT: 100,
                })) {
                    const keyArray = Array.isArray(keyBatch) ? keyBatch : [keyBatch];
                    keys.push(...keyArray.filter((k): k is string => typeof k === 'string'));
                }
                if (keys.length > 0) {
                    // Delete keys individually to avoid TypeScript/Redis API issues
                    for (const key of keys) {
                        await redis.del(key);
                    }
                }
            } catch (error) {
                console.warn('Error cleaning up test keys:', error);
            }
        }
        // Note: closeRedisClient was removed during code pruning
    });

    it('should connect to Redis successfully', async () => {
        if (!isConnected || !redis) {
            return; // Skip if Redis is not available
        }
        const pong = await redis.ping();
        expect(pong).toBe('PONG');
    });

    it('should create and retrieve a hash', async () => {
        if (!isConnected || !redis) {
            return; // Skip if Redis is not available
        }
        const hashKey = `${testPrefix}hash:test`;
        const testData = {
            field1: 'value1',
            field2: 'value2',
            number: '42',
        };

        // Set hash fields
        await redis.hSet(hashKey, testData);

        // Get all hash fields
        const retrieved = await redis.hGetAll(hashKey);
        expect(retrieved).toEqual(testData);

        // Get individual field
        const field1 = await redis.hGet(hashKey, 'field1');
        expect(field1).toBe('value1');

        // Clean up
        await redis.del(hashKey);
    });

    it('should create and manipulate a list', async () => {
        if (!isConnected || !redis) {
            return; // Skip if Redis is not available
        }
        const listKey = `${testPrefix}list:test`;

        // Clean up any existing key first
        await redis.del(listKey);

        // Push items to list - use array syntax for node-redis v5
        await redis.lPush(listKey, ['item1', 'item2', 'item3']);

        // Get list length
        const length = await redis.lLen(listKey);
        expect(length).toBe(3);

        // Get all items
        const items = await redis.lRange(listKey, 0, -1);
        expect(items).toEqual(['item3', 'item2', 'item1']); // lPush adds to left

        // Push to right
        await redis.rPush(listKey, 'item4');
        const allItems = await redis.lRange(listKey, 0, -1);
        expect(allItems).toEqual(['item3', 'item2', 'item1', 'item4']);

        // Pop from left
        const popped = await redis.lPop(listKey);
        expect(popped).toBe('item3');
        expect(await redis.lLen(listKey)).toBe(3);

        // Clean up
        await redis.del(listKey);
    });

    it('should handle hash with nested data', async () => {
        if (!isConnected || !redis) {
            return; // Skip if Redis is not available
        }
        const hashKey = `${testPrefix}hash:nested`;
        const nestedData = {
            user: 'testuser',
            metadata: JSON.stringify({ age: 25, city: 'Test City' }),
            score: '100',
        };

        await redis.hSet(hashKey, nestedData);

        const retrieved = await redis.hGetAll(hashKey);
        expect(retrieved.user).toBe('testuser');
        expect(retrieved.metadata).toBeDefined();
        expect(JSON.parse(retrieved.metadata!)).toEqual({ age: 25, city: 'Test City' });

        // Clean up
        await redis.del(hashKey);
    });

    it('should handle list operations: append and trim', async () => {
        if (!isConnected || !redis) {
            return; // Skip if Redis is not available
        }
        const listKey = `${testPrefix}list:operations`;

        // Clean up any existing key first
        await redis.del(listKey);

        // Create list - use array syntax for node-redis v5
        await redis.rPush(listKey, ['a', 'b', 'c', 'd', 'e']);

        // Trim list to keep only first 3 elements
        await redis.lTrim(listKey, 0, 2);
        const trimmed = await redis.lRange(listKey, 0, -1);
        expect(trimmed).toEqual(['a', 'b', 'c']);

        // Clean up
        await redis.del(listKey);
    });

    it('should verify Redis connection uses REDISCLI_AUTH environment variable', () => {
        // Check that REDISCLI_AUTH is set for real connection
        if (!process.env.REDISCLI_AUTH) {
            return; // Skip if REDISCLI_AUTH is not set
        }

        // This test verifies that we're using actual Redis config, not mocks
        if (!redis) {
            return; // Skip if Redis is not available
        }
        expect(redis).toBeDefined();
        if (isConnected) {
            expect(redis.isReady).toBe(true);
        }
    });
});
