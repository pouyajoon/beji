import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState, Player, Beji, StaticBeji, World } from '../components/atoms';

// Mock Redis client
const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    sadd: vi.fn(),
    smembers: vi.fn(),
    pipeline: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        sadd: vi.fn().mockReturnThis(),
        exec: vi.fn(),
    })),
};

vi.mock('../src/lib/redis/client', () => ({
    getRedisClient: () => mockRedis,
}));

describe('Redis Game State Operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Game State', () => {
        it('gets game state from Redis', async () => {
            const gameState: GameState = {
                players: [],
                worlds: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            };
            
            mockRedis.get.mockResolvedValue(JSON.stringify(gameState));
            
            const { getGameState } = await import('../src/lib/redis/gameState');
            const result = await getGameState();
            
            expect(mockRedis.get).toHaveBeenCalledWith('beji:gameState');
            expect(result).toEqual(gameState);
        });

        it('returns null when game state does not exist', async () => {
            mockRedis.get.mockResolvedValue(null);
            
            const { getGameState } = await import('../src/lib/redis/gameState');
            const result = await getGameState();
            
            expect(result).toBeNull();
        });

        it('saves game state to Redis', async () => {
            const gameState: GameState = {
                players: [{ id: 'p1', emoji: '😀', emojiCodepoints: [0x1f600], bejiIds: [], createdAt: Date.now() }],
                worlds: [],
                beji: [],
                staticBeji: [],
                inventory: {},
            };
            
            mockRedis.set.mockResolvedValue('OK');
            
            const { saveGameState } = await import('../src/lib/redis/gameState');
            const result = await saveGameState(gameState);
            
            expect(mockRedis.set).toHaveBeenCalledWith(
                'beji:gameState',
                JSON.stringify(gameState)
            );
            expect(result).toBe(true);
        });
    });

    describe('Players', () => {
        it('saves a player to Redis', async () => {
            const player: Player = {
                id: 'player1',
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: Date.now(),
            };
            
            const mockPipeline = {
                set: vi.fn().mockReturnThis(),
                sadd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([['OK', null], [1, null]]),
            };
            mockRedis.pipeline.mockReturnValue(mockPipeline);
            
            const { savePlayer } = await import('../src/lib/redis/gameState');
            const result = await savePlayer(player);
            
            expect(mockPipeline.set).toHaveBeenCalledWith(
                'beji:player:player1',
                JSON.stringify(player)
            );
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:players', 'player1');
            expect(result).toBe(true);
        });

        it('gets a player from Redis', async () => {
            const player: Player = {
                id: 'player1',
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: ['beji1'],
                createdAt: Date.now(),
            };
            
            mockRedis.get.mockResolvedValue(JSON.stringify(player));
            
            const { getPlayer } = await import('../src/lib/redis/gameState');
            const result = await getPlayer('player1');
            
            expect(mockRedis.get).toHaveBeenCalledWith('beji:player:player1');
            expect(result).toEqual(player);
        });

        it('gets all players from Redis', async () => {
            const playerIds = ['player1', 'player2'];
            const players: Player[] = [
                { id: 'player1', emoji: '😀', emojiCodepoints: [0x1f600], bejiIds: [], createdAt: Date.now() },
                { id: 'player2', emoji: '😁', emojiCodepoints: [0x1f601], bejiIds: [], createdAt: Date.now() },
            ];
            
            mockRedis.smembers.mockResolvedValue(playerIds);
            mockRedis.get
                .mockResolvedValueOnce(JSON.stringify(players[0]))
                .mockResolvedValueOnce(JSON.stringify(players[1]));
            
            const { getAllPlayers } = await import('../src/lib/redis/gameState');
            const result = await getAllPlayers();
            
            expect(mockRedis.smembers).toHaveBeenCalledWith('beji:players');
            expect(result).toEqual(players);
        });
    });

    describe('Beji', () => {
        it('saves a beji to Redis', async () => {
            const beji: Beji = {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test Beji',
                position: { x: 0, y: 0 },
                target: { x: 10, y: 10 },
                walk: true,
                createdAt: Date.now(),
            };
            
            const mockPipeline = {
                set: vi.fn().mockReturnThis(),
                sadd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    ['OK', null],
                    [1, null],
                    [1, null],
                ]),
            };
            mockRedis.pipeline.mockReturnValue(mockPipeline);
            
            const { saveBeji } = await import('../src/lib/redis/gameState');
            const result = await saveBeji(beji);
            
            expect(mockPipeline.set).toHaveBeenCalledWith(
                'beji:beji:beji1',
                JSON.stringify(beji)
            );
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:beji', 'beji1');
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:player:player1:beji', 'beji1');
            expect(result).toBe(true);
        });

        it('gets beji for a specific player', async () => {
            const bejiIds = ['beji1', 'beji2'];
            const timestamp = Date.now();
            const beji: Beji[] = [
                {
                    id: 'beji1',
                    playerId: 'player1',
                    worldId: 'world1',
                    emoji: '😀',
                    name: 'Beji 1',
                    position: { x: 0, y: 0 },
                    target: { x: 0, y: 0 },
                    walk: false,
                    createdAt: timestamp,
                },
                {
                    id: 'beji2',
                    playerId: 'player1',
                    worldId: 'world2',
                    emoji: '😁',
                    name: 'Beji 2',
                    position: { x: 10, y: 10 },
                    target: { x: 10, y: 10 },
                    walk: false,
                    createdAt: timestamp,
                },
            ];
            
            mockRedis.smembers.mockResolvedValue(bejiIds);
            mockRedis.get
                .mockResolvedValueOnce(JSON.stringify(beji[0]))
                .mockResolvedValueOnce(JSON.stringify(beji[1]));
            
            const { getBejiForPlayer } = await import('../src/lib/redis/gameState');
            const result = await getBejiForPlayer('player1');
            
            expect(mockRedis.smembers).toHaveBeenCalledWith('beji:player:player1:beji');
            expect(result).toEqual(beji);
        });
    });

    describe('Inventory', () => {
        it('saves inventory for a player', async () => {
            const inventory: Record<number, number> = {
                0x1f600: 5,
                0x1f601: 3,
            };
            
            mockRedis.set.mockResolvedValue('OK');
            
            const { saveInventory } = await import('../src/lib/redis/gameState');
            const result = await saveInventory('player1', inventory);
            
            expect(mockRedis.set).toHaveBeenCalledWith(
                'beji:inventory:player1',
                JSON.stringify(inventory)
            );
            expect(result).toBe(true);
        });

        it('updates inventory item count', async () => {
            const initialInventory: Record<number, number> = {
                0x1f600: 5,
            };
            const updatedInventory: Record<number, number> = {
                0x1f600: 7,
            };
            
            mockRedis.get.mockResolvedValue(JSON.stringify(initialInventory));
            mockRedis.set.mockResolvedValue('OK');
            
            const { updateInventoryItem } = await import('../src/lib/redis/gameState');
            const result = await updateInventoryItem('player1', 0x1f600, 2);
            
            expect(mockRedis.get).toHaveBeenCalledWith('beji:inventory:player1');
            expect(mockRedis.set).toHaveBeenCalledWith(
                'beji:inventory:player1',
                JSON.stringify(updatedInventory)
            );
            expect(result).toBe(true);
        });

        it('removes inventory item when count reaches zero', async () => {
            const initialInventory: Record<number, number> = {
                0x1f600: 1,
            };
            const updatedInventory: Record<number, number> = {};
            
            mockRedis.get.mockResolvedValue(JSON.stringify(initialInventory));
            mockRedis.set.mockResolvedValue('OK');
            
            const { updateInventoryItem } = await import('../src/lib/redis/gameState');
            const result = await updateInventoryItem('player1', 0x1f600, -1);
            
            expect(mockRedis.set).toHaveBeenCalledWith(
                'beji:inventory:player1',
                JSON.stringify(updatedInventory)
            );
            expect(result).toBe(true);
        });
    });

    describe('Static Beji', () => {
        it('saves a static beji to Redis', async () => {
            const staticBeji: StaticBeji = {
                id: 'static1',
                worldId: 'world1',
                emojiCodepoint: 0x1f600,
                emoji: '😀',
                position: { x: 50, y: 50 },
                harvested: false,
            };
            
            const mockPipeline = {
                set: vi.fn().mockReturnThis(),
                sadd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    ['OK', null],
                    [1, null],
                ]),
            };
            mockRedis.pipeline.mockReturnValue(mockPipeline);
            
            const { saveStaticBeji } = await import('../src/lib/redis/gameState');
            const result = await saveStaticBeji(staticBeji);
            
            expect(mockPipeline.set).toHaveBeenCalledWith(
                'beji:staticBeji:static1',
                JSON.stringify(staticBeji)
            );
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:staticBeji', 'static1');
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:world:world1:staticBeji', 'static1');
            expect(result).toBe(true);
        });

        it('gets static beji for a specific world', async () => {
            const staticBejiIds = ['static1', 'static2'];
            const staticBeji: StaticBeji[] = [
                {
                    id: 'static1',
                    worldId: 'world1',
                    emojiCodepoint: 0x1f600,
                    emoji: '😀',
                    position: { x: 50, y: 50 },
                    harvested: false,
                },
                {
                    id: 'static2',
                    worldId: 'world1',
                    emojiCodepoint: 0x1f601,
                    emoji: '😁',
                    position: { x: 60, y: 60 },
                    harvested: false,
                },
            ];

            mockRedis.smembers.mockResolvedValue(staticBejiIds);
            mockRedis.get
                .mockResolvedValueOnce(JSON.stringify(staticBeji[0]))
                .mockResolvedValueOnce(JSON.stringify(staticBeji[1]));

            const { getStaticBejiForWorld } = await import('../src/lib/redis/gameState');
            const result = await getStaticBejiForWorld('world1');

            expect(mockRedis.smembers).toHaveBeenCalledWith('beji:world:world1:staticBeji');
            expect(result).toEqual(staticBeji);
        });
    });

    describe('Worlds', () => {
        it('saves a world to Redis', async () => {
            const world: World = {
                id: 'world1',
                mainBejiId: 'beji1',
                staticBejiIds: ['static1', 'static2'],
                createdAt: Date.now(),
            };

            const mockPipeline = {
                set: vi.fn().mockReturnThis(),
                sadd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    ['OK', null],
                    [1, null],
                    [1, null],
                    [1, null],
                ]),
            };
            mockRedis.pipeline.mockReturnValue(mockPipeline);

            const { saveWorld } = await import('../src/lib/redis/gameState');
            const result = await saveWorld(world);

            expect(mockPipeline.set).toHaveBeenCalledWith(
                'beji:world:world1',
                JSON.stringify(world)
            );
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:worlds', 'world1');
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:world:world1:staticBeji', 'static1');
            expect(mockPipeline.sadd).toHaveBeenCalledWith('beji:world:world1:staticBeji', 'static2');
            expect(result).toBe(true);
        });

        it('gets a world from Redis', async () => {
            const world: World = {
                id: 'world1',
                mainBejiId: 'beji1',
                staticBejiIds: ['static1'],
                createdAt: Date.now(),
            };

            mockRedis.get.mockResolvedValue(JSON.stringify(world));

            const { getWorld } = await import('../src/lib/redis/gameState');
            const result = await getWorld('world1');

            expect(mockRedis.get).toHaveBeenCalledWith('beji:world:world1');
            expect(result).toEqual(world);
        });

        it('gets all worlds from Redis', async () => {
            const worldIds = ['world1', 'world2'];
            const timestamp = Date.now();
            const worlds: World[] = [
                {
                    id: 'world1',
                    mainBejiId: 'beji1',
                    staticBejiIds: ['static1'],
                    createdAt: timestamp,
                },
                {
                    id: 'world2',
                    mainBejiId: 'beji2',
                    staticBejiIds: ['static2'],
                    createdAt: timestamp,
                },
            ];

            mockRedis.smembers.mockResolvedValue(worldIds);
            mockRedis.get
                .mockResolvedValueOnce(JSON.stringify(worlds[0]))
                .mockResolvedValueOnce(JSON.stringify(worlds[1]));

            const { getAllWorlds } = await import('../src/lib/redis/gameState');
            const result = await getAllWorlds();

            expect(mockRedis.smembers).toHaveBeenCalledWith('beji:worlds');
            expect(result).toEqual(worlds);
        });

        it('gets world for a specific beji', async () => {
            const beji: Beji = {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test Beji',
                position: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                walk: false,
                createdAt: Date.now(),
            };
            const world: World = {
                id: 'world1',
                mainBejiId: 'beji1',
                staticBejiIds: [],
                createdAt: Date.now(),
            };

            mockRedis.get
                .mockResolvedValueOnce(JSON.stringify(beji))
                .mockResolvedValueOnce(JSON.stringify(world));

            const { getWorldForBeji } = await import('../src/lib/redis/gameState');
            const result = await getWorldForBeji('beji1');

            expect(mockRedis.get).toHaveBeenCalledWith('beji:beji:beji1');
            expect(mockRedis.get).toHaveBeenCalledWith('beji:world:world1');
            expect(result).toEqual(world);
        });
    });
});

