import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';
import { getRedisClient } from '../src/lib/redis/client';
import {
    savePlayer,
    saveBeji,
    saveWorld,
    saveStaticBeji,
    getPlayer,
    getBeji,
    getWorld,
    getStaticBejiForWorld,
} from '../src/lib/redis/gameState';
import type { Player, Beji, World, StaticBeji } from '../components/atoms';
import { codepointsToEmoji } from '../components/emoji';

// Load .env.local for integration tests
config({ path: resolve(process.cwd(), '.env.local') });

describe('Redis Beji and World Integration Test', () => {
    let redis: ReturnType<typeof getRedisClient> | undefined;
    let isConnected = false;
    const testPrefix = 'test:beji-world:';

    // Test data
    let testPlayerId: string;
    let testWorldId: string;
    let testBejiId: string;
    let testStaticBejiIds: string[];

    beforeAll(async () => {
        // Skip if REDISCLI_AUTH is not set
        if (!process.env.REDISCLI_AUTH) {
            console.warn('REDISCLI_AUTH not set, skipping Redis beji-world integration test');
            return;
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
            console.warn('Redis connection failed, integration tests will be skipped:', error);
            isConnected = false;
        }
    });

    afterAll(async () => {
        if (isConnected && redis) {
            try {
                // Clean up all test data
                const testKeys: string[] = [];

                // Clean up players
                if (testPlayerId) {
                    testKeys.push(`beji:player:${testPlayerId}`);
                    testKeys.push(`beji:player:${testPlayerId}:beji`);
                }

                // Clean up beji
                if (testBejiId) {
                    testKeys.push(`beji:beji:${testBejiId}`);
                    if (testWorldId) {
                        testKeys.push(`beji:world:${testWorldId}:beji`);
                    }
                }

                // Clean up static beji
                if (testStaticBejiIds) {
                    for (const id of testStaticBejiIds) {
                        testKeys.push(`beji:staticBeji:${id}`);
                        if (testWorldId) {
                            testKeys.push(`beji:world:${testWorldId}:staticBeji`);
                        }
                    }
                }

                // Clean up world
                if (testWorldId) {
                    testKeys.push(`beji:world:${testWorldId}`);
                }

                // Remove from sets
                if (testPlayerId) {
                    await redis.sRem('beji:players', testPlayerId);
                }
                if (testBejiId) {
                    await redis.sRem('beji:beji', testBejiId);
                }
                if (testStaticBejiIds) {
                    await redis.sRem('beji:staticBeji', testStaticBejiIds);
                }
                if (testWorldId) {
                    await redis.sRem('beji:worlds', testWorldId);
                }

                // Delete all keys
                if (testKeys.length > 0) {
                    await redis.del(testKeys);
                }
            } catch (error) {
                console.warn('Error cleaning up test data:', error);
            }
        }
        // Note: closeRedisClient was removed during code pruning
    });

    it('should verify Redis connection is available', () => {
        if (!isConnected || !redis) {
            return; // Skip if Redis is not available
        }
        expect(redis).toBeDefined();
        expect(redis.isReady).toBe(true);
    });

    it('should create a player using savePlayer', async () => {
        if (!isConnected) {
            return;
        }

        const timestamp = Date.now();
        testPlayerId = `${testPrefix}player-${timestamp}`;
        const emojiCodepoints = [0x1f600]; // 😀
        const emojiChar = codepointsToEmoji(emojiCodepoints);

        const player: Player = {
            id: testPlayerId,
            emoji: emojiChar,
            emojiCodepoints: emojiCodepoints,
            bejiIds: [], // Will be updated when beji is created
            createdAt: timestamp,
        };

        const result = await savePlayer(player);
        expect(result).toBe(true);

        // Verify player was saved
        const retrieved = await getPlayer(testPlayerId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(testPlayerId);
        expect(retrieved?.emoji).toBe(emojiChar);
        expect(retrieved?.emojiCodepoints).toEqual(emojiCodepoints);
    });

    it('should create a beji using saveBeji', async () => {
        if (!isConnected) {
            return;
        }

        if (!testPlayerId) {
            // Create a player first if not already created
            const timestamp = Date.now();
            testPlayerId = `${testPrefix}player-${timestamp}`;
            const player: Player = {
                id: testPlayerId,
                emoji: codepointsToEmoji([0x1f600]),
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: timestamp,
            };
            await savePlayer(player);
        }

        const timestamp = Date.now();
        testBejiId = `${testPrefix}beji-${timestamp}`;
        const emojiCodepoints = [0x1f601]; // 😁
        const emojiChar = codepointsToEmoji(emojiCodepoints);

        const beji: Beji = {
            id: testBejiId,
            playerId: testPlayerId,
            worldId: '', // Will be set when world is created
            emoji: emojiChar,
            name: 'Test Beji',
            position: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
            walk: false,
            createdAt: timestamp,
        };

        const result = await saveBeji(beji);
        expect(result).toBe(true);

        // Verify beji was saved
        const retrieved = await getBeji(testBejiId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(testBejiId);
        expect(retrieved?.playerId).toBe(testPlayerId);
        expect(retrieved?.emoji).toBe(emojiChar);
        expect(retrieved?.name).toBe('Test Beji');
    });

    it('should create static bejis using saveStaticBeji', async () => {
        if (!isConnected) {
            return;
        }

        if (!testPlayerId) {
            const timestamp = Date.now();
            testPlayerId = `${testPrefix}player-${timestamp}`;
            const player: Player = {
                id: testPlayerId,
                emoji: codepointsToEmoji([0x1f600]),
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: timestamp,
            };
            await savePlayer(player);
        }

        // Create a temporary world for static beji
        const timestamp = Date.now();
        testWorldId = `${testPrefix}world-${timestamp}`;

        const baseUnicode = 0x1f600;
        testStaticBejiIds = [];
        const staticBejis: StaticBeji[] = [];

        // Create 3 static bejis (similar to app logic)
        for (let offset = -1; offset <= 1; offset++) {
            const staticUnicode = baseUnicode + offset;
            const staticEmoji = codepointsToEmoji([staticUnicode]);
            const staticBejiId = `${testPrefix}static-beji-${timestamp}-${offset}`;
            testStaticBejiIds.push(staticBejiId);

            // Generate random position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 50;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            const staticBeji: StaticBeji = {
                id: staticBejiId,
                worldId: testWorldId,
                emojiCodepoint: staticUnicode,
                emoji: staticEmoji,
                position: { x, y },
                harvested: false,
            };

            staticBejis.push(staticBeji);
        }

        // Save all static bejis
        const savePromises = staticBejis.map((sb) => saveStaticBeji(sb));
        const results = await Promise.all(savePromises);
        expect(results.every((r) => r === true)).toBe(true);

        // Verify static bejis were saved
        const retrieved = await getStaticBejiForWorld(testWorldId);
        expect(retrieved.length).toBe(3);
        expect(retrieved.map((sb) => sb.id)).toEqual(expect.arrayContaining(testStaticBejiIds));
    });

    it('should create a world using saveWorld', async () => {
        if (!isConnected) {
            return;
        }

        // Ensure we have the necessary IDs
        if (!testPlayerId) {
            const timestamp = Date.now();
            testPlayerId = `${testPrefix}player-${timestamp}`;
            const player: Player = {
                id: testPlayerId,
                emoji: codepointsToEmoji([0x1f600]),
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: timestamp,
            };
            await savePlayer(player);
        }

        if (!testBejiId) {
            const timestamp = Date.now();
            testBejiId = `${testPrefix}beji-${timestamp}`;
            const beji: Beji = {
                id: testBejiId,
                playerId: testPlayerId,
                worldId: '',
                emoji: codepointsToEmoji([0x1f601]),
                name: 'Test Beji',
                position: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                walk: false,
                createdAt: Date.now(),
            };
            await saveBeji(beji);
        }

        if (!testWorldId) {
            testWorldId = `${testPrefix}world-${Date.now()}`;
        }

        if (!testStaticBejiIds || testStaticBejiIds.length === 0) {
            // Create static bejis for the world
            const baseUnicode = 0x1f600;
            testStaticBejiIds = [];
            const timestamp = Date.now();

            for (let offset = -1; offset <= 1; offset++) {
                const staticUnicode = baseUnicode + offset;
                const staticEmoji = codepointsToEmoji([staticUnicode]);
                const staticBejiId = `${testPrefix}static-beji-${timestamp}-${offset}`;
                testStaticBejiIds.push(staticBejiId);

                const staticBeji: StaticBeji = {
                    id: staticBejiId,
                    worldId: testWorldId,
                    emojiCodepoint: staticUnicode,
                    emoji: staticEmoji,
                    position: { x: Math.random() * 50, y: Math.random() * 50 },
                    harvested: false,
                };
                await saveStaticBeji(staticBeji);
            }
        }

        // Update beji with worldId
        const beji = await getBeji(testBejiId);
        if (beji && beji.worldId !== testWorldId) {
            await saveBeji({ ...beji, worldId: testWorldId });
        }

        const timestamp = Date.now();
        const world: World = {
            id: testWorldId,
            mainBejiId: testBejiId,
            staticBejiIds: testStaticBejiIds,
            createdAt: timestamp,
        };

        const result = await saveWorld(world);
        expect(result).toBe(true);

        // Verify world was saved
        const retrieved = await getWorld(testWorldId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(testWorldId);
        expect(retrieved?.mainBejiId).toBe(testBejiId);
        expect(retrieved?.staticBejiIds).toEqual(expect.arrayContaining(testStaticBejiIds));
    });

    it('should create a complete world with player, beji, and static bejis (like CreateWorld)', async () => {
        if (!isConnected) {
            return;
        }

        const timestamp = Date.now();
        const testId = `complete-${timestamp}`;

        // Create player (same pattern as app)
        const playerId = `${testPrefix}${testId}-player`;
        const emojiCodepoints = [0x1f602]; // 😂
        const emojiChar = codepointsToEmoji(emojiCodepoints);

        const player: Player = {
            id: playerId,
            emoji: emojiChar,
            emojiCodepoints: emojiCodepoints,
            bejiIds: [],
            createdAt: timestamp,
        };

        // Create beji (same pattern as app)
        const bejiId = `${testPrefix}${testId}-beji`;
        const beji: Beji = {
            id: bejiId,
            playerId: playerId,
            worldId: '', // Will be set
            emoji: emojiChar,
            name: 'Complete Test Beji',
            position: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
            walk: true,
            createdAt: timestamp,
        };

        // Create world
        const worldId = `${testPrefix}${testId}-world`;
        const staticBejiIds: string[] = [];
        const staticBejis: StaticBeji[] = [];

        // Create static bejis (same pattern as app - 11 static bejis with offsets -5 to +5)
        const baseUnicode = emojiCodepoints[0] ?? 0x1f600;
        for (let offset = -5; offset <= 5; offset++) {
            const staticUnicode = baseUnicode + offset;
            const staticEmoji = codepointsToEmoji([staticUnicode]);

            // Generate random position within 150 meters (same as app)
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            const staticBejiId = `${testPrefix}${testId}-static-${offset}`;
            staticBejiIds.push(staticBejiId);

            staticBejis.push({
                id: staticBejiId,
                worldId: worldId,
                emojiCodepoint: staticUnicode,
                emoji: staticEmoji,
                position: { x, y },
                harvested: false,
            });
        }

        // Update player with beji
        player.bejiIds = [bejiId];
        beji.worldId = worldId;

        // Create world
        const world: World = {
            id: worldId,
            mainBejiId: bejiId,
            staticBejiIds: staticBejiIds,
            createdAt: timestamp,
        };

        // Save everything using the same methods as the app (same pattern as CreateWorld route)
        const saveResults = await Promise.all([
            savePlayer(player),
            saveBeji(beji),
            saveWorld(world),
            ...staticBejis.map((sb) => saveStaticBeji(sb)),
        ]);

        expect(saveResults.every((r) => r === true)).toBe(true);

        // Verify everything was saved correctly
        const savedPlayer = await getPlayer(playerId);
        expect(savedPlayer).toBeDefined();
        expect(savedPlayer?.id).toBe(playerId);
        expect(savedPlayer?.bejiIds).toContain(bejiId);

        const savedBeji = await getBeji(bejiId);
        expect(savedBeji).toBeDefined();
        expect(savedBeji?.id).toBe(bejiId);
        expect(savedBeji?.worldId).toBe(worldId);
        expect(savedBeji?.name).toBe('Complete Test Beji');

        const savedWorld = await getWorld(worldId);
        expect(savedWorld).toBeDefined();
        expect(savedWorld?.id).toBe(worldId);
        expect(savedWorld?.mainBejiId).toBe(bejiId);
        expect(savedWorld?.staticBejiIds.length).toBe(11);

        const savedStaticBeji = await getStaticBejiForWorld(worldId);
        expect(savedStaticBeji.length).toBe(11);
        expect(savedStaticBeji.map((sb) => sb.id)).toEqual(expect.arrayContaining(staticBejiIds));

        // Clean up this test's data
        if (redis) {
            try {
                const keysToDelete = [
                    `beji:player:${playerId}`,
                    `beji:player:${playerId}:beji`,
                    `beji:beji:${bejiId}`,
                    `beji:world:${worldId}:beji`,
                    `beji:world:${worldId}`,
                    `beji:world:${worldId}:staticBeji`,
                    ...staticBejis.map((sb) => `beji:staticBeji:${sb.id}`)
                ];
                await redis.del(keysToDelete);
                await redis.sRem('beji:players', playerId);
                await redis.sRem('beji:beji', bejiId);
                await redis.sRem('beji:staticBeji', staticBejiIds);
                await redis.sRem('beji:worlds', worldId);
            } catch (error) {
                console.warn('Error cleaning up complete test data:', error);
            }
        }
    });
});

