import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing routes
vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

const mockGetPlayerIdForUser = vi.fn();
const mockGetBejiForPlayer = vi.fn();
const mockGetWorld = vi.fn();

vi.mock("../src/lib/redis/gameState", () => ({
    getPlayerIdForUser: (...args: any[]) => mockGetPlayerIdForUser(...args),
    getBejiForPlayer: (...args: any[]) => mockGetBejiForPlayer(...args),
    getWorld: (...args: any[]) => mockGetWorld(...args),
}));

const mockVerifyJWT = vi.fn();

vi.mock("../src/lib/auth/jwt", () => ({
    verifyJWT: (...args: any[]) => mockVerifyJWT(...args),
}));

// Import route after mocking
const { GET } = await import("../app/api/users/[userId]/bejis/route");
const { cookies } = await import("next/headers");

describe("User Bejis API Route", () => {
    const originalEnv = process.env;
    const mockCookieStore = {
        get: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            JWT_SECRET: "test-jwt-secret",
        };
        vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    it("returns 401 when no auth token exists", async () => {
        const url = new URL("http://localhost:3000/api/users/user123/bejis");
        const request = new NextRequest(url);

        mockCookieStore.get.mockReturnValueOnce(undefined);

        const response = await GET(request, { params: Promise.resolve({ userId: "user123" }) });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    it("returns 403 when user requests another user's bejis", async () => {
        const url = new URL("http://localhost:3000/api/users/user123/bejis");
        const request = new NextRequest(url);

        const mockPayload = {
            userId: "different-user",
            email: "different@example.com",
        };

        mockCookieStore.get.mockReturnValueOnce({ value: "valid-token" });
        mockVerifyJWT.mockResolvedValueOnce(mockPayload);

        const response = await GET(request, { params: Promise.resolve({ userId: "user123" }) });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
    });

    it("returns empty array when user has no player", async () => {
        const url = new URL("http://localhost:3000/api/users/user123/bejis");
        const request = new NextRequest(url);

        const mockPayload = {
            userId: "user123",
            email: "user@example.com",
        };

        mockCookieStore.get.mockReturnValueOnce({ value: "valid-token" });
        mockVerifyJWT.mockResolvedValueOnce(mockPayload);
        mockGetPlayerIdForUser.mockResolvedValueOnce(null);

        const response = await GET(request, { params: Promise.resolve({ userId: "user123" }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ bejis: [] });
        expect(mockGetBejiForPlayer).not.toHaveBeenCalled();
    });

    it("returns bejis with world info for user with player", async () => {
        const url = new URL("http://localhost:3000/api/users/user123/bejis");
        const request = new NextRequest(url);

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

        mockCookieStore.get.mockReturnValueOnce({ value: "valid-token" });
        mockVerifyJWT.mockResolvedValueOnce(mockPayload);
        mockGetPlayerIdForUser.mockResolvedValueOnce(mockPlayerId);
        mockGetBejiForPlayer.mockResolvedValueOnce(mockBejis);
        mockGetWorld
            .mockResolvedValueOnce(mockWorld1)
            .mockResolvedValueOnce(mockWorld2);

        const response = await GET(request, { params: Promise.resolve({ userId: "user123" }) });
        const data = await response.json();

        expect(response.status).toBe(200);
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
        const url = new URL("http://localhost:3000/api/users/user123/bejis");
        const request = new NextRequest(url);

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

        mockCookieStore.get.mockReturnValueOnce({ value: "valid-token" });
        mockVerifyJWT.mockResolvedValueOnce(mockPayload);
        mockGetPlayerIdForUser.mockResolvedValueOnce(mockPlayerId);
        mockGetBejiForPlayer.mockResolvedValueOnce(mockBejis);
        mockGetWorld.mockResolvedValueOnce(null);

        const response = await GET(request, { params: Promise.resolve({ userId: "user123" }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.bejis).toHaveLength(1);
        expect(data.bejis[0].world).toBeNull();
    });
});

