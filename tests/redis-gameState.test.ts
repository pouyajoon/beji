import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState, Player, Beji, StaticBeji, World } from '../components/atoms';

// Mock Redis client
const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    sAdd: vi.fn(),
    sMembers: vi.fn(),
    multi: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        sAdd: vi.fn().mockReturnThis(),
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

    describe('Players', () => {
        it('saves a player to Redis', async () => {
            const player: Player = {
                id: 'player1',
                emoji: '😀',
                emojiCodepoints: [0x1f600],
                bejiIds: [],
                createdAt: Date.now(),
            };
            
            const mockMulti = {
                set: vi.fn().mockReturnThis(),
                sAdd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([['OK', null], [1, null]]),
            };
            mockRedis.multi.mockReturnValue(mockMulti);
            
            const { savePlayer } = await import('../src/lib/redis/gameState');
            const result = await savePlayer(player);
            
            expect(mockMulti.set).toHaveBeenCalledWith(
                'beji:player:player1',
                JSON.stringify(player)
            );
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:players', 'player1');
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
            
            const mockMulti = {
                set: vi.fn().mockReturnThis(),
                sAdd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    ['OK', null],
                    [1, null],
                    [1, null],
                ]),
            };
            mockRedis.multi.mockReturnValue(mockMulti);
            
            const { saveBeji } = await import('../src/lib/redis/gameState');
            const result = await saveBeji(beji);
            
            expect(mockMulti.set).toHaveBeenCalledWith(
                'beji:beji:beji1',
                JSON.stringify(beji)
            );
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:beji', 'beji1');
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:player:player1:beji', 'beji1');
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
            
            mockRedis.sMembers.mockResolvedValue(bejiIds);
            mockRedis.get
                .mockResolvedValueOnce(JSON.stringify(beji[0]))
                .mockResolvedValueOnce(JSON.stringify(beji[1]));
            
            const { getBejiForPlayer } = await import('../src/lib/redis/gameState');
            const result = await getBejiForPlayer('player1');
            
            expect(mockRedis.sMembers).toHaveBeenCalledWith('beji:player:player1:beji');
            expect(result).toEqual(beji);
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
            
            const mockMulti = {
                set: vi.fn().mockReturnThis(),
                sAdd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    ['OK', null],
                    [1, null],
                ]),
            };
            mockRedis.multi.mockReturnValue(mockMulti);
            
            const { saveStaticBeji } = await import('../src/lib/redis/gameState');
            const result = await saveStaticBeji(staticBeji);
            
            expect(mockMulti.set).toHaveBeenCalledWith(
                'beji:staticBeji:static1',
                JSON.stringify(staticBeji)
            );
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:staticBeji', 'static1');
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:world:world1:staticBeji', 'static1');
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

            mockRedis.sMembers.mockResolvedValue(staticBejiIds);
            mockRedis.get
                .mockResolvedValueOnce(JSON.stringify(staticBeji[0]))
                .mockResolvedValueOnce(JSON.stringify(staticBeji[1]));

            const { getStaticBejiForWorld } = await import('../src/lib/redis/gameState');
            const result = await getStaticBejiForWorld('world1');

            expect(mockRedis.sMembers).toHaveBeenCalledWith('beji:world:world1:staticBeji');
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

            const mockMulti = {
                set: vi.fn().mockReturnThis(),
                sAdd: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    ['OK', null],
                    [1, null],
                    [1, null],
                    [1, null],
                ]),
            };
            mockRedis.multi.mockReturnValue(mockMulti);
            
            const { saveWorld } = await import('../src/lib/redis/gameState');
            const result = await saveWorld(world);
            
            expect(mockMulti.set).toHaveBeenCalledWith(
                'beji:world:world1',
                JSON.stringify(world)
            );
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:worlds', 'world1');
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:world:world1:staticBeji', 'static1');
            expect(mockMulti.sAdd).toHaveBeenCalledWith('beji:world:world1:staticBeji', 'static2');
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
    });
});

