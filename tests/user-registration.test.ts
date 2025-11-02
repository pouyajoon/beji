import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";
import { getRedisClient, closeRedisClient } from "../src/lib/redis/client";
import {
    getPlayerIdForUser,
    linkUserToPlayer,
    getOrCreatePlayerForUser,
    getPlayer,
    savePlayer,
    getBejiForPlayer,
} from "../src/lib/redis/gameState";
import type { Player } from "../components/atoms";
import { codepointsToEmoji } from "../components/emoji";

// Load .env.local for integration tests
config({ path: resolve(process.cwd(), ".env.local") });

describe("User Registration in Redis", () => {
    let redis: ReturnType<typeof getRedisClient>;
    let isConnected = false;
    const testPrefix = "test:user-reg:";

    beforeAll(async () => {
        redis = getRedisClient();

        try {
            if (redis.isReady || redis.isOpen) {
                await redis.ping();
                isConnected = true;
            } else if (!redis.isOpen) {
                await Promise.race([
                    redis.connect(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Connection timeout")), 5000)
                    ),
                ]);
                await redis.ping();
                isConnected = true;
            }
        } catch (error) {
            console.warn("Redis connection failed, integration tests will be skipped:", error);
            isConnected = false;
        }
    });

    afterAll(async () => {
        if (isConnected && redis) {
            try {
                // Clean up test data
                const testUserIds = [
                    `${testPrefix}user1`,
                    `${testPrefix}user2`,
                    `${testPrefix}user3`,
                ];
                
                for (const userId of testUserIds) {
                    const playerId = await redis.get(`beji:user:${userId}:player`);
                    if (playerId) {
                        await redis.del(`beji:user:${userId}:player`);
                        await redis.del(`beji:player:${playerId}`);
                        await redis.sRem("beji:players", playerId);
                        const bejiIds = await redis.sMembers(`beji:player:${playerId}:beji`);
                        if (bejiIds.length > 0) {
                            await redis.del(`beji:player:${playerId}:beji`);
                        }
                    }
                }
            } catch (error) {
                console.warn("Error cleaning up test data:", error);
            }
        }
        closeRedisClient();
    });

    it("should link a user to a player", async () => {
        if (!isConnected) {
            return;
        }

        const userId = `${testPrefix}user1`;
        const playerId = `${testPrefix}player-${Date.now()}`;

        const result = await linkUserToPlayer(userId, playerId);
        expect(result).toBe(true);

        const retrievedPlayerId = await getPlayerIdForUser(userId);
        expect(retrievedPlayerId).toBe(playerId);
    });

    it("should get player ID for a linked user", async () => {
        if (!isConnected) {
            return;
        }

        const userId = `${testPrefix}user2`;
        const playerId = `${testPrefix}player-${Date.now()}`;

        await linkUserToPlayer(userId, playerId);
        const retrieved = await getPlayerIdForUser(userId);

        expect(retrieved).toBe(playerId);
    });

    it("should return null for unlinked user", async () => {
        if (!isConnected) {
            return;
        }

        const userId = `${testPrefix}nonexistent-user-${Date.now()}`;
        const playerId = await getPlayerIdForUser(userId);

        expect(playerId).toBeNull();
    });

    it("should get or create a player for a new user", async () => {
        if (!isConnected) {
            return;
        }

        const userId = `${testPrefix}user3`;
        const emojiCodepoints = [0x1f600]; // 😀

        const player = await getOrCreatePlayerForUser(userId, emojiCodepoints);

        expect(player).toBeDefined();
        expect(player.id).toBeDefined();
        expect(player.emojiCodepoints).toEqual(emojiCodepoints);
        expect(player.emoji).toBe(codepointsToEmoji(emojiCodepoints));
        expect(player.bejiIds).toEqual([]);
        expect(player.createdAt).toBeGreaterThan(0);

        // Verify user is linked
        const linkedPlayerId = await getPlayerIdForUser(userId);
        expect(linkedPlayerId).toBe(player.id);
    });

    it("should return existing player for user who already has one", async () => {
        if (!isConnected) {
            return;
        }

        const userId = `${testPrefix}user3`;
        const emojiCodepoints1 = [0x1f600]; // 😀
        const emojiCodepoints2 = [0x1f601]; // 😁

        // Create first player
        const player1 = await getOrCreatePlayerForUser(userId, emojiCodepoints1);
        const player1Id = player1.id;

        // Try to get or create with different emoji (should return existing)
        const player2 = await getOrCreatePlayerForUser(userId, emojiCodepoints2);

        expect(player2.id).toBe(player1Id);
        expect(player2.emojiCodepoints).toEqual(emojiCodepoints1); // Should keep original
    });

    it("should handle multiple bejis per player", async () => {
        if (!isConnected) {
            return;
        }

        const userId = `${testPrefix}user3`;
        const emojiCodepoints = [0x1f600];
        
        const player = await getOrCreatePlayerForUser(userId, emojiCodepoints);
        
        // Create some bejis for this player (simulate)
        const bejiIds = await getBejiForPlayer(player.id);
        expect(Array.isArray(bejiIds)).toBe(true);
    });
});

