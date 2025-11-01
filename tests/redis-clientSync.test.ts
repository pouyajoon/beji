import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState, Player, Beji, StaticBeji } from '../components/atoms';

// Mock global fetch
global.fetch = vi.fn();

describe('Redis Client Sync Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Game State Sync', () => {
        it('fetches game state from API', async () => {
            const gameState: GameState = {
                players: [],
                worlds: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => gameState,
            });
            
            const { fetchGameState } = await import('../src/lib/redis/clientSync');
            const result = await fetchGameState();
            
            expect(global.fetch).toHaveBeenCalledWith('/api/game-state');
            expect(result).toEqual(gameState);
        });

        it('returns null when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 500,
            });
            
            const { fetchGameState } = await import('../src/lib/redis/clientSync');
            const result = await fetchGameState();
            
            expect(result).toBeNull();
        });

        it('saves game state to API', async () => {
            const gameState: GameState = {
                players: [{ id: 'p1', emoji: '😀', emojiCodepoints: [0x1f600], bejiIds: [], createdAt: Date.now() }],
                worlds: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });
            
            const { saveGameStateToServer } = await import('../src/lib/redis/clientSync');
            const result = await saveGameStateToServer(gameState);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/game-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameState),
            });
            expect(result).toBe(true);
        });
    });

    describe('Player Sync', () => {
        it('fetches a player from API', async () => {
            const player: Player = {
                id: 'p1',
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: Date.now(),
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => player,
            });
            
            const { fetchPlayer } = await import('../src/lib/redis/clientSync');
            const result = await fetchPlayer('p1');
            
            expect(global.fetch).toHaveBeenCalledWith('/api/players/p1');
            expect(result).toEqual(player);
        });

        it('returns null when player not found', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 404,
            });
            
            const { fetchPlayer } = await import('../src/lib/redis/clientSync');
            const result = await fetchPlayer('p1');
            
            expect(result).toBeNull();
        });

        it('saves a player to API', async () => {
            const player: Player = {
                id: 'p1',
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: Date.now(),
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => player,
            });
            
            const { savePlayerToServer } = await import('../src/lib/redis/clientSync');
            const result = await savePlayerToServer(player);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(player),
            });
            expect(result).toBe(true);
        });

        it('updates a player on API', async () => {
            const player: Player = {
                id: 'p1',
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: Date.now(),
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => player,
            });
            
            const { updatePlayerOnServer } = await import('../src/lib/redis/clientSync');
            const result = await updatePlayerOnServer(player);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/players/p1', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(player),
            });
            expect(result).toBe(true);
        });
    });

    describe('Beji Sync', () => {
        it('fetches a beji from API', async () => {
            const beji: Beji = {
                id: 'b1',
                playerId: 'p1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test Beji',
                position: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                walk: false,
                createdAt: Date.now(),
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => beji,
            });
            
            const { fetchBeji } = await import('../src/lib/redis/clientSync');
            const result = await fetchBeji('b1');
            
            expect(global.fetch).toHaveBeenCalledWith('/api/beji/b1');
            expect(result).toEqual(beji);
        });

        it('fetches beji for a player from API', async () => {
            const timestamp = Date.now();
            const beji: Beji[] = [
                {
                    id: 'b1',
                    playerId: 'p1',
                    worldId: 'world1',
                    emoji: '😀',
                    name: 'Test Beji',
                    position: { x: 0, y: 0 },
                    target: { x: 0, y: 0 },
                    walk: false,
                    createdAt: timestamp,
                },
            ];
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => beji,
            });
            
            const { fetchBejiForPlayer } = await import('../src/lib/redis/clientSync');
            const result = await fetchBejiForPlayer('p1');
            
            expect(global.fetch).toHaveBeenCalledWith('/api/beji?playerId=p1');
            expect(result).toEqual(beji);
        });

        it('saves a beji to API', async () => {
            const beji: Beji = {
                id: 'b1',
                playerId: 'p1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test Beji',
                position: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                walk: false,
                createdAt: Date.now(),
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => beji,
            });
            
            const { saveBejiToServer } = await import('../src/lib/redis/clientSync');
            const result = await saveBejiToServer(beji);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/beji', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(beji),
            });
            expect(result).toBe(true);
        });
    });

    describe('Inventory Sync', () => {
        it('fetches inventory from API', async () => {
            const inventory: Record<number, number> = {
                0x1f600: 5,
                0x1f601: 3,
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => inventory,
            });
            
            const { fetchInventory } = await import('../src/lib/redis/clientSync');
            const result = await fetchInventory('p1');
            
            expect(global.fetch).toHaveBeenCalledWith('/api/inventory/p1');
            expect(result).toEqual(inventory);
        });

        it('updates inventory on API', async () => {
            const inventory: Record<number, number> = {
                0x1f600: 10,
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => inventory,
            });
            
            const { updateInventoryOnServer } = await import('../src/lib/redis/clientSync');
            const result = await updateInventoryOnServer('p1', inventory);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/inventory/p1', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inventory),
            });
            expect(result).toBe(true);
        });

        it('updates inventory item on API', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });
            
            const { updateInventoryItemOnServer } = await import('../src/lib/redis/clientSync');
            const result = await updateInventoryItemOnServer('p1', 0x1f600, 2);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/inventory/p1', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ codepoint: 0x1f600, delta: 2 }),
            });
            expect(result).toBe(true);
        });
    });

    describe('Static Beji Sync', () => {
        it('fetches a static beji from API', async () => {
            const staticBeji: StaticBeji = {
                id: 'static1',
                emojiCodepoint: 0x1f600,
                emoji: '😀',
                position: { x: 50, y: 50 },
                harvested: false,
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => staticBeji,
            });
            
            const { fetchStaticBeji } = await import('../src/lib/redis/clientSync');
            const result = await fetchStaticBeji('static1');
            
            expect(global.fetch).toHaveBeenCalledWith('/api/static-beji?id=static1');
            expect(result).toEqual(staticBeji);
        });

        it('saves a static beji to API', async () => {
            const staticBeji: StaticBeji = {
                id: 'static1',
                worldId: 'world1',
                emojiCodepoint: 0x1f600,
                emoji: '😀',
                position: { x: 50, y: 50 },
                harvested: false,
            };
            
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });
            
            const { saveStaticBejiToServer } = await import('../src/lib/redis/clientSync');
            const result = await saveStaticBejiToServer(staticBeji);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/static-beji', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(staticBeji),
            });
            expect(result).toBe(true);
        });
    });
});

