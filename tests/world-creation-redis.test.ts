import { config } from 'dotenv';
import { resolve } from 'path';
import type { RedisClientType } from 'redis';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createTestFastifyWithRoutes } from './helpers/fastify-routes';
import { getRedisClient } from '../src/lib/redis/client';

// Load .env.local for integration tests
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Integration test for World Creation with Redis
 * 
 * This test verifies that:
 * 1. CreateWorld RPC endpoint works with the actual Redis server
 * 2. GetWorld RPC endpoint can retrieve the created world
 * 3. All data (player, beji, world, static bejis) is correctly stored in Redis
 * 
 * Required environment variable (set in .env.local):
 * - REDISCLI_AUTH=redis://host:port or rediss://host:port (full URL)
 */
describe('World Creation with Redis Integration Test', () => {
    let fastify: Awaited<ReturnType<typeof createTestFastifyWithRoutes>>;
    let redis: RedisClientType;
    let isConnected = false;
    const testPrefix = 'test:world-creation:';
    let createdWorldId: string | null = null;
    let createdPlayerId: string | null = null;
    let createdBejiId: string | null = null;
    let createdStaticBejiIds: string[] = [];

    beforeAll(async () => {
        // Check if REDISCLI_AUTH is set
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

        // Initialize Redis client
        redis = getRedisClient();

        // Try to connect and verify Redis is accessible
        try {
            if (redis.isReady || redis.isOpen) {
                await redis.ping();
                isConnected = true;
            } else if (!redis.isOpen) {
                await Promise.race([
                    redis.connect(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Connection timeout')), 10000)
                    ),
                ]);
                await redis.ping();
                isConnected = true;
            }
            console.log('✅ Redis connection established for world creation test');
        } catch (error) {
            console.warn('Redis connection failed, integration tests will be skipped:', error);
            isConnected = false;
        }

        // Initialize Fastify server
        fastify = await createTestFastifyWithRoutes();
        await fastify.ready();
    });

    afterAll(async () => {
        // Clean up test data
        if (isConnected && redis && createdWorldId) {
            try {
                const keysToDelete: string[] = [];

                // Clean up player
                if (createdPlayerId) {
                    keysToDelete.push(`beji:player:${createdPlayerId}`);
                    keysToDelete.push(`beji:player:${createdPlayerId}:beji`);
                    await redis.sRem('beji:players', createdPlayerId);
                }

                // Clean up beji
                if (createdBejiId) {
                    keysToDelete.push(`beji:beji:${createdBejiId}`);
                    if (createdWorldId) {
                        keysToDelete.push(`beji:world:${createdWorldId}:beji`);
                    }
                    await redis.sRem('beji:beji', createdBejiId);
                }

                // Clean up static bejis
                if (createdStaticBejiIds.length > 0) {
                    for (const id of createdStaticBejiIds) {
                        keysToDelete.push(`beji:staticBeji:${id}`);
                    }
                    if (createdWorldId) {
                        keysToDelete.push(`beji:world:${createdWorldId}:staticBeji`);
                    }
                    if (createdStaticBejiIds.length > 0) {
                        await redis.sRem('beji:staticBeji', createdStaticBejiIds);
                    }
                }

                // Clean up world
                if (createdWorldId) {
                    keysToDelete.push(`beji:world:${createdWorldId}`);
                    await redis.sRem('beji:worlds', createdWorldId);
                }

                // Delete all keys
                if (keysToDelete.length > 0) {
                    await redis.del(keysToDelete);
                }

                console.log(`✅ Cleaned up test data for world ${createdWorldId}`);
            } catch (error) {
                console.warn('Error cleaning up test data:', error);
            }
        }

        // Close Fastify server
        if (fastify) {
            await fastify.close();
        }
    });

    it('should verify Redis connection is available', () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }
        expect(redis).toBeDefined();
        expect(redis.isReady).toBe(true);
    });

    it('should create a world via CreateWorld RPC endpoint', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        const requestBody = {
            method: 'CreateWorld',
            params: {
                bejiName: `${testPrefix}Test Beji`,
                emojiCodepoints: [0x1f600], // 😀
            },
        };

        const response = await fastify.inject({
            method: 'POST',
            url: '/api/rpc/world/v1',
            headers: { 'Content-Type': 'application/json' },
            payload: requestBody,
        });

        expect(response.statusCode).toBe(200);

        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('world');
        expect(data.world).toHaveProperty('world');
        expect(data.world).toHaveProperty('player');
        expect(data.world).toHaveProperty('beji');
        expect(data.world).toHaveProperty('staticBeji');
        expect(Array.isArray(data.world.staticBeji)).toBe(true);
        expect(data.world.staticBeji.length).toBe(11); // -5 to +5 offsets = 11 static bejis

        // Store IDs for cleanup
        createdWorldId = data.world.world.id;
        createdPlayerId = data.world.player.id;
        createdBejiId = data.world.beji.id;
        createdStaticBejiIds = data.world.staticBeji.map((sb: { id: string }) => sb.id);

        // Verify world data structure
        expect(createdWorldId).toBeTruthy();
        expect(createdPlayerId).toBeTruthy();
        expect(createdBejiId).toBeTruthy();
        expect(createdStaticBejiIds.length).toBe(11);

        // Verify beji name
        expect(data.world.beji.name).toBe(`${testPrefix}Test Beji`);
        expect(data.world.beji.emoji).toBe('😀');

        // Verify world has correct main beji ID
        expect(data.world.world.mainBejiId).toBe(createdBejiId);
        expect(data.world.world.staticBejiIds.length).toBe(11);

        console.log(`✅ Created world ${createdWorldId} with player ${createdPlayerId} and beji ${createdBejiId}`);
    });

    it('should retrieve the created world via GetWorld RPC endpoint', async () => {
        if (!isConnected || !createdWorldId) {
            return; // Skip if Redis is not available or world wasn't created
        }

        const requestBody = {
            method: 'GetWorld',
            params: {
                worldId: createdWorldId,
            },
        };

        const response = await fastify.inject({
            method: 'POST',
            url: '/api/rpc/world/v1',
            headers: { 'Content-Type': 'application/json' },
            payload: requestBody,
        });

        expect(response.statusCode).toBe(200);

        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('world');
        expect(data.world.world.id).toBe(createdWorldId);
        expect(data.world.world.mainBejiId).toBe(createdBejiId);
        expect(data.world.player.id).toBe(createdPlayerId);
        expect(data.world.beji.id).toBe(createdBejiId);
        expect(data.world.beji.name).toBe(`${testPrefix}Test Beji`);
        expect(data.world.staticBeji.length).toBe(11);

        // Verify static beji IDs match
        const retrievedStaticBejiIds = data.world.staticBeji.map((sb: { id: string }) => sb.id);
        expect(retrievedStaticBejiIds.sort()).toEqual(createdStaticBejiIds.sort());

        console.log(`✅ Retrieved world ${createdWorldId} successfully`);
    });

    it('should verify data is correctly stored in Redis', async () => {
        if (!isConnected || !createdWorldId) {
            return; // Skip if Redis is not available or world wasn't created
        }

        // Verify world exists in Redis
        const worldData = await redis.get(`beji:world:${createdWorldId}`);
        expect(worldData).toBeTruthy();
        const world = JSON.parse(worldData!);
        expect(world.id).toBe(createdWorldId);
        expect(world.mainBejiId).toBe(createdBejiId);

        // Verify player exists in Redis
        const playerData = await redis.get(`beji:player:${createdPlayerId}`);
        expect(playerData).toBeTruthy();
        const player = JSON.parse(playerData!);
        expect(player.id).toBe(createdPlayerId);
        expect(player.bejiIds).toContain(createdBejiId);

        // Verify beji exists in Redis
        const bejiData = await redis.get(`beji:beji:${createdBejiId}`);
        expect(bejiData).toBeTruthy();
        const beji = JSON.parse(bejiData!);
        expect(beji.id).toBe(createdBejiId);
        expect(beji.worldId).toBe(createdWorldId);
        expect(beji.playerId).toBe(createdPlayerId);
        expect(beji.name).toBe(`${testPrefix}Test Beji`);

        // Verify static bejis exist in Redis
        for (const staticBejiId of createdStaticBejiIds) {
            const staticBejiData = await redis.get(`beji:staticBeji:${staticBejiId}`);
            expect(staticBejiData).toBeTruthy();
            const staticBeji = JSON.parse(staticBejiData!);
            expect(staticBeji.worldId).toBe(createdWorldId);
        }

        // Verify sets contain the IDs
        if (createdWorldId) {
            const worldInSet = await redis.sIsMember('beji:worlds', createdWorldId);
            expect(worldInSet).toBe(true);
        }

        if (createdPlayerId) {
            const playerInSet = await redis.sIsMember('beji:players', createdPlayerId);
            expect(playerInSet).toBe(true);
        }

        if (createdBejiId) {
            const bejiInSet = await redis.sIsMember('beji:beji', createdBejiId);
            expect(bejiInSet).toBe(true);
        }

        console.log('✅ Verified all data is correctly stored in Redis');
    });

    it('should verify world creation with different emoji codepoints', async () => {
        if (!isConnected) {
            return; // Skip if Redis is not available
        }

        const requestBody = {
            method: 'CreateWorld',
            params: {
                bejiName: `${testPrefix}Different Emoji`,
                emojiCodepoints: [0x1f601], // 😁
            },
        };

        const response = await fastify.inject({
            method: 'POST',
            url: '/api/rpc/world/v1',
            headers: { 'Content-Type': 'application/json' },
            payload: requestBody,
        });

        expect(response.statusCode).toBe(200);

        const data = JSON.parse(response.body);
        expect(data.world.beji.emoji).toBe('😁');
        expect(data.world.player.emoji).toBe('😁');

        // Verify static bejis use correct base unicode (0x1f601)
        const baseUnicode = 0x1f601;
        const staticBejiCodepoints = data.world.staticBeji.map(
            (sb: { emojiCodepoint: number }) => sb.emojiCodepoint
        );

        // Check that static bejis have codepoints from baseUnicode - 5 to baseUnicode + 5
        for (let offset = -5; offset <= 5; offset++) {
            expect(staticBejiCodepoints).toContain(baseUnicode + offset);
        }

        // Clean up this test world
        const testWorldId = data.world.world.id;
        try {
            const keysToDelete: string[] = [];
            keysToDelete.push(`beji:player:${data.world.player.id}`);
            keysToDelete.push(`beji:player:${data.world.player.id}:beji`);
            keysToDelete.push(`beji:beji:${data.world.beji.id}`);
            keysToDelete.push(`beji:world:${testWorldId}:beji`);
            keysToDelete.push(`beji:world:${testWorldId}`);
            keysToDelete.push(`beji:world:${testWorldId}:staticBeji`);

            for (const sb of data.world.staticBeji) {
                keysToDelete.push(`beji:staticBeji:${sb.id}`);
            }

            await redis.del(keysToDelete);
            await redis.sRem('beji:players', data.world.player.id);
            await redis.sRem('beji:beji', data.world.beji.id);
            await redis.sRem('beji:staticBeji', data.world.staticBeji.map((sb: { id: string }) => sb.id));
            await redis.sRem('beji:worlds', testWorldId);
        } catch (error) {
            console.warn('Error cleaning up test world:', error);
        }

        console.log('✅ Verified world creation with different emoji codepoints');
    });
});

