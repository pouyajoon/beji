import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";
import { getRedisClient } from "../src/lib/redis/client";
import {
    getPlayerIdForUser,
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
        // Note: closeRedisClient was removed during code pruning
    });

    // Note: linkUserToPlayer was removed during code pruning
    // These tests are skipped as the functionality no longer exists
    it.skip("should link a user to a player", async () => {
        // linkUserToPlayer removed - test skipped
    });

    it.skip("should get player ID for a linked user", async () => {
        // linkUserToPlayer removed - test skipped
    });

    it("should return null for unlinked user", async () => {
        if (!isConnected) {
            return;
        }

        const userId = `${testPrefix}nonexistent-user-${Date.now()}`;
        const playerId = await getPlayerIdForUser(userId);

        expect(playerId).toBeNull();
    });

    // Note: getOrCreatePlayerForUser was removed during code pruning
    it.skip("should get or create a player for a new user", async () => {
        // getOrCreatePlayerForUser removed - test skipped
    });

    it.skip("should return existing player for user who already has one", async () => {
        // getOrCreatePlayerForUser removed - test skipped
    });

    it.skip("should handle multiple bejis per player", async () => {
        // getOrCreatePlayerForUser removed - test skipped
    });
});

