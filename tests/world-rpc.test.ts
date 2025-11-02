import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Player, Beji, StaticBeji, World } from '../components/atoms';
import { createTestFastifyWithRoutes } from './helpers/fastify-routes';

// Mock Redis functions
const mockSavePlayer = vi.fn();
const mockSaveBeji = vi.fn();
const mockSaveStaticBeji = vi.fn();
const mockSaveWorld = vi.fn();
const mockGetWorld = vi.fn();
const mockGetBeji = vi.fn();
const mockGetPlayer = vi.fn();
const mockGetStaticBejiForWorld = vi.fn();

vi.mock('../src/lib/redis/gameState', () => ({
    savePlayer: (player: Player) => mockSavePlayer(player),
    saveBeji: (beji: Beji) => mockSaveBeji(beji),
    saveStaticBeji: (staticBeji: StaticBeji) => mockSaveStaticBeji(staticBeji),
    saveWorld: (world: World) => mockSaveWorld(world),
    getWorld: (worldId: string) => mockGetWorld(worldId),
    getBeji: (bejiId: string) => mockGetBeji(bejiId),
    getPlayer: (playerId: string) => mockGetPlayer(playerId),
    getStaticBejiForWorld: (worldId: string) => mockGetStaticBejiForWorld(worldId),
}));

// Mock codepointsToEmoji
vi.mock('../components/emoji', () => ({
    codepointsToEmoji: (codepoints: number[]) => String.fromCodePoint(...codepoints),
}));

describe('World RPC API', () => {
    let fastify: Awaited<ReturnType<typeof createTestFastifyWithRoutes>>;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Default mock implementations
        mockSavePlayer.mockResolvedValue(true);
        mockSaveBeji.mockResolvedValue(true);
        mockSaveStaticBeji.mockResolvedValue(true);
        mockSaveWorld.mockResolvedValue(true);
        
        fastify = await createTestFastifyWithRoutes();
        await fastify.ready();
    });

    afterEach(async () => {
        await fastify.close();
    });

    describe('POST /api/rpc/world/v1 - CreateWorld', () => {
        it('creates a world with player, beji, and static bejis', async () => {
            const requestBody = {
                method: 'CreateWorld',
                params: {
                    bejiName: 'Test Beji',
                    emojiCodepoints: [0x1f600],
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(200);
            expect(data).toHaveProperty('world');
            expect(data.world).toHaveProperty('world');
            expect(data.world).toHaveProperty('player');
            expect(data.world).toHaveProperty('beji');
            expect(data.world).toHaveProperty('staticBeji');
            expect(Array.isArray(data.world.staticBeji)).toBe(true);
            expect(data.world.staticBeji.length).toBe(11); // -5 to +5 offsets = 11 static bejis

            // Verify Redis calls
            expect(mockSavePlayer).toHaveBeenCalledTimes(1);
            expect(mockSaveBeji).toHaveBeenCalledTimes(1);
            expect(mockSaveWorld).toHaveBeenCalledTimes(1);
            expect(mockSaveStaticBeji).toHaveBeenCalledTimes(11);

            // Verify player data
            const savedPlayer = mockSavePlayer.mock.calls[0]?.[0];
            expect(savedPlayer).toBeDefined();
            expect(savedPlayer.emojiCodepoints).toEqual([0x1f600]);
            expect(savedPlayer.bejiIds.length).toBe(1);

            // Verify beji data
            const savedBeji = mockSaveBeji.mock.calls[0]?.[0];
            expect(savedBeji).toBeDefined();
            expect(savedBeji.name).toBe('Test Beji');
            expect(savedBeji.emoji).toBe('😀');
            expect(savedBeji.position).toEqual({ x: 0, y: 0 });
            expect(savedBeji.target).toEqual({ x: 0, y: 0 });

            // Verify world data
            const savedWorld = mockSaveWorld.mock.calls[0]?.[0];
            expect(savedWorld).toBeDefined();
            expect(savedWorld.staticBejiIds.length).toBe(11);
        });

        it('returns error when bejiName is missing', async () => {
            const requestBody = {
                method: 'CreateWorld',
                params: {
                    emojiCodepoints: [0x1f600],
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(400);
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('bejiName');
        });

        it('returns error when emojiCodepoints is missing', async () => {
            const requestBody = {
                method: 'CreateWorld',
                params: {
                    bejiName: 'Test Beji',
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(400);
            expect(data).toHaveProperty('error');
        });

        it('generates static bejis with correct unicode offsets', async () => {
            const baseUnicode = 0x1f600;
            const requestBody = {
                method: 'CreateWorld',
                params: {
                    bejiName: 'Test Beji',
                    emojiCodepoints: [baseUnicode],
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(200);

            // Verify static beji codepoints are -5 to +5 offsets
            const staticBejis = data.world.staticBeji;
            const codepoints = staticBejis.map((sb: { emojiCodepoint: number }) => sb.emojiCodepoint);
            
            for (let offset = -5; offset <= 5; offset++) {
                expect(codepoints).toContain(baseUnicode + offset);
            }
        });
    });

    describe('POST /api/rpc/world/v1 - GetWorld', () => {
        it('retrieves a world with all associated data', async () => {
            const timestamp = Date.now();
            const worldId = `world-${timestamp}`;
            const bejiId = `beji-${timestamp}`;
            const playerId = `player-${timestamp}`;

            const mockWorld: World = {
                id: worldId,
                mainBejiId: bejiId,
                staticBejiIds: ['static1', 'static2'],
                createdAt: timestamp,
            };

            const mockBeji: Beji = {
                id: bejiId,
                playerId: playerId,
                worldId: worldId,
                emoji: '😀',
                name: 'Test Beji',
                position: { x: 0, y: 0 },
                target: { x: 10, y: 10 },
                walk: true,
                createdAt: timestamp,
            };

            const mockPlayer: Player = {
                id: playerId,
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: [bejiId],
                createdAt: timestamp,
            };

            const mockStaticBeji: StaticBeji[] = [
                {
                    id: 'static1',
                    worldId: worldId,
                    emojiCodepoint: 0x1f5fb,
                    emoji: '🗻',
                    position: { x: 50, y: 50 },
                    harvested: false,
                },
                {
                    id: 'static2',
                    worldId: worldId,
                    emojiCodepoint: 0x1f5fc,
                    emoji: '🗼',
                    position: { x: -50, y: -50 },
                    harvested: true,
                },
            ];

            mockGetWorld.mockResolvedValue(mockWorld);
            mockGetBeji.mockResolvedValue(mockBeji);
            mockGetPlayer.mockResolvedValue(mockPlayer);
            mockGetStaticBejiForWorld.mockResolvedValue(mockStaticBeji);

            const requestBody = {
                method: 'GetWorld',
                params: {
                    worldId: worldId,
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(200);
            expect(data).toHaveProperty('world');
            expect(data.world.world.id).toBe(worldId);
            expect(data.world.beji.id).toBe(bejiId);
            expect(data.world.player.id).toBe(playerId);
            expect(data.world.staticBeji.length).toBe(2);

            // Verify Redis calls
            expect(mockGetWorld).toHaveBeenCalledWith(worldId);
            expect(mockGetBeji).toHaveBeenCalledWith(bejiId);
            expect(mockGetPlayer).toHaveBeenCalledWith(playerId);
            expect(mockGetStaticBejiForWorld).toHaveBeenCalledWith(worldId);
        });

        it('returns 404 when world does not exist', async () => {
            mockGetWorld.mockResolvedValue(null);

            const requestBody = {
                method: 'GetWorld',
                params: {
                    worldId: 'nonexistent-world',
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(404);
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('not found');
        });

        it('returns 404 when main beji does not exist', async () => {
            const timestamp = Date.now();
            const worldId = `world-${timestamp}`;
            const bejiId = `beji-${timestamp}`;

            const mockWorld: World = {
                id: worldId,
                mainBejiId: bejiId,
                staticBejiIds: [],
                createdAt: timestamp,
            };

            mockGetWorld.mockResolvedValue(mockWorld);
            mockGetBeji.mockResolvedValue(null);

            const requestBody = {
                method: 'GetWorld',
                params: {
                    worldId: worldId,
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(404);
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('beji');
        });

        it('returns 404 when player does not exist', async () => {
            const timestamp = Date.now();
            const worldId = `world-${timestamp}`;
            const bejiId = `beji-${timestamp}`;
            const playerId = `player-${timestamp}`;

            const mockWorld: World = {
                id: worldId,
                mainBejiId: bejiId,
                staticBejiIds: [],
                createdAt: timestamp,
            };

            const mockBeji: Beji = {
                id: bejiId,
                playerId: playerId,
                worldId: worldId,
                emoji: '😀',
                name: 'Test Beji',
                position: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                walk: true,
                createdAt: timestamp,
            };

            mockGetWorld.mockResolvedValue(mockWorld);
            mockGetBeji.mockResolvedValue(mockBeji);
            mockGetPlayer.mockResolvedValue(null);

            const requestBody = {
                method: 'GetWorld',
                params: {
                    worldId: worldId,
                },
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(404);
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('Player');
        });

        it('returns 400 when worldId is missing', async () => {
            const requestBody = {
                method: 'GetWorld',
                params: {},
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(400);
            expect(data).toHaveProperty('error');
        });

        it('returns 400 for unknown method', async () => {
            const requestBody = {
                method: 'UnknownMethod',
                params: {},
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/rpc/world/v1',
                headers: { 'Content-Type': 'application/json' },
                payload: requestBody,
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(400);
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('Unknown method');
        });
    });
});
