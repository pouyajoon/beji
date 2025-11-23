import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createTestFastifyWithRoutes } from './helpers/fastify-routes';

const mockGetPlayerIdsForUser = vi.fn();
const mockGetBejiForPlayer = vi.fn();
const mockGetWorld = vi.fn();

vi.mock("../src/lib/redis/gameState", () => ({
    getPlayerIdsForUser: (...args: any[]) => mockGetPlayerIdsForUser(...args),
    getBejiForPlayer: (...args: any[]) => mockGetBejiForPlayer(...args),
    getWorld: (...args: any[]) => mockGetWorld(...args),
}));

const mockVerifyJWT = vi.fn();

vi.mock("../src/lib/auth/jwt", () => ({
    verifyJWT: (...args: any[]) => mockVerifyJWT(...args),
}));

describe("User Bejis API Route", () => {
    const originalEnv = process.env;
    let fastify: Awaited<ReturnType<typeof createTestFastifyWithRoutes>>;

    beforeEach(async () => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            JWT_SECRET: "test-jwt-secret",
        };
        
        fastify = await createTestFastifyWithRoutes();
        await fastify.ready();
    });

    afterEach(async () => {
        process.env = originalEnv;
        vi.restoreAllMocks();
        await fastify.close();
    });

    it("returns 401 when no auth token exists", async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/api/users/user123/bejis',
            headers: {
                cookie: '', // No auth token
            },
        });

        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    it("returns 403 when user requests another user's bejis", async () => {
        const mockPayload = {
            userId: "different-user",
            email: "different@example.com",
        };

        mockVerifyJWT.mockResolvedValueOnce(mockPayload);

        const response = await fastify.inject({
            method: 'GET',
            url: '/api/users/user123/bejis',
            headers: {
                cookie: 'authorization=valid-token',
            },
        });

        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
    });

    it("returns empty array when user has no player", async () => {
        const mockPayload = {
            userId: "user123",
            email: "user@example.com",
        };

        mockVerifyJWT.mockResolvedValueOnce(mockPayload);
        mockGetPlayerIdsForUser.mockResolvedValueOnce([]);

        const response = await fastify.inject({
            method: 'GET',
            url: '/api/users/user123/bejis',
            headers: {
                cookie: 'authorization=valid-token',
            },
        });

        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(data).toEqual({ bejis: [] });
        expect(mockGetBejiForPlayer).not.toHaveBeenCalled();
    });

    it("returns bejis with world info for user with player", async () => {
        const mockPayload = {
            userId: "user123",
            email: "user@example.com",
        };

        const mockPlayerId = "player-123";
        const mockBejis = [
            {
                id: "beji-1",
                playerId: mockPlayerId,
                worldId: "world-1",
                emoji: "😀",
                name: "Beji One",
                position: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                walk: true,
                createdAt: Date.now(),
            },
            {
                id: "beji-2",
                playerId: mockPlayerId,
                worldId: "world-2",
                emoji: "😁",
                name: "Beji Two",
                position: { x: 10, y: 10 },
                target: { x: 10, y: 10 },
                walk: false,
                createdAt: Date.now(),
            },
        ];

        const mockWorld1 = {
            id: "world-1",
            mainBejiId: "beji-1",
            staticBejiIds: [],
            createdAt: Date.now(),
        };

        const mockWorld2 = {
            id: "world-2",
            mainBejiId: "beji-2",
            staticBejiIds: [],
            createdAt: Date.now(),
        };

        mockVerifyJWT.mockResolvedValueOnce(mockPayload);
        mockGetPlayerIdsForUser.mockResolvedValueOnce([mockPlayerId]);
        mockGetBejiForPlayer.mockResolvedValueOnce(mockBejis);
        mockGetWorld
            .mockResolvedValueOnce(mockWorld1)
            .mockResolvedValueOnce(mockWorld2);

        const response = await fastify.inject({
            method: 'GET',
            url: '/api/users/user123/bejis',
            headers: {
                cookie: 'authorization=valid-token',
            },
        });

        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(data.bejis).toHaveLength(2);
        expect(data.bejis[0]).toMatchObject({
            ...mockBejis[0],
            world: {
                id: mockWorld1.id,
                mainBejiId: mockWorld1.mainBejiId,
                createdAt: mockWorld1.createdAt,
            },
        });
        expect(data.bejis[1]).toMatchObject({
            ...mockBejis[1],
            world: {
                id: mockWorld2.id,
                mainBejiId: mockWorld2.mainBejiId,
                createdAt: mockWorld2.createdAt,
            },
        });
    });

    it("handles bejis without world gracefully", async () => {
        const mockPayload = {
            userId: "user123",
            email: "user@example.com",
        };

        const mockPlayerId = "player-123";
        const mockBejis = [
            {
                id: "beji-1",
                playerId: mockPlayerId,
                worldId: "", // No world
                emoji: "😀",
                name: "Beji One",
                position: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        mockVerifyJWT.mockResolvedValueOnce(mockPayload);
        mockGetPlayerIdsForUser.mockResolvedValueOnce([mockPlayerId]);
        mockGetBejiForPlayer.mockResolvedValueOnce(mockBejis);
        mockGetWorld.mockResolvedValueOnce(null);

        const response = await fastify.inject({
            method: 'GET',
            url: '/api/users/user123/bejis',
            headers: {
                cookie: 'authorization=valid-token',
            },
        });

        const data = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(data.bejis).toHaveLength(1);
        expect(data.bejis[0].world).toBeNull();
    });
});
