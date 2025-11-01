import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState, Player, Beji } from '../components/atoms';

// Mock Redis functions
const mockGetGameState = vi.fn();
const mockSaveGameState = vi.fn();
const mockGetPlayer = vi.fn();
const mockSavePlayer = vi.fn();
const mockGetAllPlayers = vi.fn();
const mockGetBeji = vi.fn();
const mockSaveBeji = vi.fn();
const mockGetAllBeji = vi.fn();
const mockGetBejiForPlayer = vi.fn();
const mockGetInventory = vi.fn();
const mockSaveInventory = vi.fn();
const mockUpdateInventoryItem = vi.fn();

vi.mock('../src/lib/redis/gameState', () => ({
    getGameState: () => mockGetGameState(),
    saveGameState: (state: GameState) => mockSaveGameState(state),
    getPlayer: (id: string) => mockGetPlayer(id),
    savePlayer: (player: Player) => mockSavePlayer(player),
    getAllPlayers: () => mockGetAllPlayers(),
    getBeji: (id: string) => mockGetBeji(id),
    saveBeji: (beji: Beji) => mockSaveBeji(beji),
    getAllBeji: () => mockGetAllBeji(),
    getBejiForPlayer: (playerId: string) => mockGetBejiForPlayer(playerId),
    getInventory: (playerId: string) => mockGetInventory(playerId),
    saveInventory: (playerId: string, inventory: Record<number, number>) =>
        mockSaveInventory(playerId, inventory),
    updateInventoryItem: (playerId: string, codepoint: number, delta: number) =>
        mockUpdateInventoryItem(playerId, codepoint, delta),
}));

describe('Redis API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/game-state', () => {
        it('returns game state from Redis', async () => {
            const gameState: GameState = {
                players: [],
                worlds: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            };
            
            mockGetGameState.mockResolvedValue(gameState);
            
            const { GET } = await import('../app/api/game-state/route');
            const response = await GET();
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(gameState);
        });

        it('returns empty game state when Redis returns null', async () => {
            mockGetGameState.mockResolvedValue(null);
            
            const { GET } = await import('../app/api/game-state/route');
            const response = await GET();
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual({
                players: [],
                worlds: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            });
        });
    });

    describe('POST /api/game-state', () => {
        it('saves game state to Redis', async () => {
            const gameState: GameState = {
                players: [{ id: 'p1', emoji: '😀', emojiCodepoints: [0x1f600], bejiIds: [], createdAt: Date.now() }],
                worlds: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            };
            
            mockSaveGameState.mockResolvedValue(true);
            
            const request = new Request('http://localhost/api/game-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameState),
            });
            
            const { POST } = await import('../app/api/game-state/route');
            const response = await POST(request);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual({ success: true });
            expect(mockSaveGameState).toHaveBeenCalledWith(gameState);
        });

        it('returns error when save fails', async () => {
            const gameState: GameState = {
                players: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            };
            
            mockSaveGameState.mockResolvedValue(false);
            
            const request = new Request('http://localhost/api/game-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameState),
            });
            
            const { POST } = await import('../app/api/game-state/route');
            const response = await POST(request);
            const data = await response.json();
            
            expect(response.status).toBe(500);
            expect(data).toHaveProperty('error');
        });
    });

    describe('GET /api/players', () => {
        it('returns all players from Redis', async () => {
            const timestamp = Date.now();
            const players: Player[] = [
                { id: 'p1', emoji: '😀', emojiCodepoints: [0x1f600], bejiIds: [], createdAt: timestamp },
                { id: 'p2', emoji: '😁', emojiCodepoints: [0x1f601], bejiIds: [], createdAt: timestamp },
            ];
            
            mockGetAllPlayers.mockResolvedValue(players);
            
            const { GET } = await import('../app/api/players/route');
            const response = await GET();
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(players);
        });
    });

    describe('POST /api/players', () => {
        it('saves a player to Redis', async () => {
            const player: Player = {
                id: 'p1',
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: Date.now(),
            };
            
            mockSavePlayer.mockResolvedValue(true);
            
            const request = new Request('http://localhost/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(player),
            });
            
            const { POST } = await import('../app/api/players/route');
            const response = await POST(request);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(player);
            expect(mockSavePlayer).toHaveBeenCalledWith(player);
        });
    });

    describe('GET /api/beji', () => {
        it('returns all beji when no playerId query param', async () => {
            const timestamp = Date.now();
            const beji: Beji[] = [
                {
                    id: 'b1',
                    playerId: 'p1',
                    worldId: 'world1',
                    emoji: '😀',
                    name: 'Beji 1',
                    position: { x: 0, y: 0 },
                    target: { x: 0, y: 0 },
                    walk: false,
                    createdAt: timestamp,
                },
            ];
            
            mockGetAllBeji.mockResolvedValue(beji);
            
            // Create a NextRequest-like object with nextUrl
            const url = new URL('http://localhost/api/beji');
            const request = {
                nextUrl: url,
            } as unknown as Request;
            
            const { GET } = await import('../app/api/beji/route');
            const response = await GET(request as Parameters<typeof GET>[0]);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(beji);
        });

        it('returns beji for specific player when playerId query param is provided', async () => {
            const timestamp = Date.now();
            const beji: Beji[] = [
                {
                    id: 'b1',
                    playerId: 'p1',
                    worldId: 'world1',
                    emoji: '😀',
                    name: 'Beji 1',
                    position: { x: 0, y: 0 },
                    target: { x: 0, y: 0 },
                    walk: false,
                    createdAt: timestamp,
                },
            ];
            
            mockGetBejiForPlayer.mockResolvedValue(beji);
            
            // Create a NextRequest-like object with nextUrl
            const url = new URL('http://localhost/api/beji?playerId=p1');
            const request = {
                nextUrl: url,
            } as unknown as Request;
            
            const { GET } = await import('../app/api/beji/route');
            const response = await GET(request as Parameters<typeof GET>[0]);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(beji);
            expect(mockGetBejiForPlayer).toHaveBeenCalledWith('p1');
        });
    });

    describe('GET /api/inventory/[playerId]', () => {
        it('returns inventory for a player', async () => {
            const inventory: Record<number, number> = {
                0x1f600: 5,
                0x1f601: 3,
            };
            
            mockGetInventory.mockResolvedValue(inventory);
            
            const { GET } = await import('../app/api/inventory/[playerId]/route');
            const response = await GET(new Request('http://localhost'), {
                params: Promise.resolve({ playerId: 'p1' }),
            });
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(inventory);
            expect(mockGetInventory).toHaveBeenCalledWith('p1');
        });
    });

    describe('PUT /api/inventory/[playerId]', () => {
        it('updates entire inventory when body is an object', async () => {
            const inventory: Record<number, number> = {
                0x1f600: 10,
            };
            
            mockSaveInventory.mockResolvedValue(true);
            mockGetInventory.mockResolvedValue(inventory);
            
            const request = new Request('http://localhost/api/inventory/p1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inventory),
            });
            
            const { PUT } = await import('../app/api/inventory/[playerId]/route');
            const response = await PUT(request, {
                params: Promise.resolve({ playerId: 'p1' }),
            });
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(inventory);
            expect(mockSaveInventory).toHaveBeenCalledWith('p1', inventory);
        });

        it('updates specific inventory item when body has codepoint and delta', async () => {
            const inventory: Record<number, number> = {
                0x1f600: 7,
            };
            
            mockUpdateInventoryItem.mockResolvedValue(true);
            mockGetInventory.mockResolvedValue(inventory);
            
            const request = new Request('http://localhost/api/inventory/p1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codepoint: 0x1f600, delta: 2 }),
            });
            
            const { PUT } = await import('../app/api/inventory/[playerId]/route');
            const response = await PUT(request, {
                params: Promise.resolve({ playerId: 'p1' }),
            });
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toEqual(inventory);
            expect(mockUpdateInventoryItem).toHaveBeenCalledWith('p1', 0x1f600, 2);
        });
    });
});

