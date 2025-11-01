import { getRedisClient } from "./client";
import type { GameState, Player, Beji, StaticBeji, World } from "../../../components/atoms";

const GAME_STATE_KEY = "beji:gameState";
const PLAYERS_KEY = "beji:players";
const WORLDS_KEY = "beji:worlds";
const BEJI_KEY = "beji:beji";
const STATIC_BEJI_KEY = "beji:staticBeji";
const INVENTORY_KEY = "beji:inventory";

// Key helpers
function playerKey(playerId: string): string {
    return `beji:player:${playerId}`;
}

function worldKey(worldId: string): string {
    return `beji:world:${worldId}`;
}

function bejiKey(bejiId: string): string {
    return `beji:beji:${bejiId}`;
}

function staticBejiKey(staticBejiId: string): string {
    return `beji:staticBeji:${staticBejiId}`;
}

function inventoryKey(playerId: string): string {
    return `beji:inventory:${playerId}`;
}

/**
 * Get the full game state from Redis
 */
export async function getGameState(): Promise<GameState | null> {
    try {
        const client = getRedisClient();
        const data = await client.get(GAME_STATE_KEY);
        if (!data) return null;
        return JSON.parse(data) as GameState;
    } catch (error) {
        console.error("Error getting game state from Redis:", error);
        return null;
    }
}

/**
 * Save the full game state to Redis
 */
export async function saveGameState(state: GameState): Promise<boolean> {
    try {
        const client = getRedisClient();
        await client.set(GAME_STATE_KEY, JSON.stringify(state));
        return true;
    } catch (error) {
        console.error("Error saving game state to Redis:", error);
        return false;
    }
}

/**
 * Get a specific player from Redis
 */
export async function getPlayer(playerId: string): Promise<Player | null> {
    try {
        const client = getRedisClient();
        const data = await client.get(playerKey(playerId));
        if (!data) return null;
        return JSON.parse(data) as Player;
    } catch (error) {
        console.error(`Error getting player ${playerId} from Redis:`, error);
        return null;
    }
}

/**
 * Save a player to Redis
 */
export async function savePlayer(player: Player): Promise<boolean> {
    try {
        const client = getRedisClient();
        const multi = client.multi();
        multi.set(playerKey(player.id), JSON.stringify(player));
        multi.sAdd(PLAYERS_KEY, player.id);
        // Update beji tracking for player
        if (player.bejiIds && player.bejiIds.length > 0) {
            for (const bejiId of player.bejiIds) {
                multi.sAdd(`beji:player:${player.id}:beji`, bejiId);
            }
        }
        await multi.exec();
        return true;
    } catch (error) {
        console.error(`Error saving player ${player.id} to Redis:`, error);
        return false;
    }
}

/**
 * Get all players from Redis
 */
export async function getAllPlayers(): Promise<Player[]> {
    try {
        const client = getRedisClient();
        const playerIds = await client.sMembers(PLAYERS_KEY);
        if (playerIds.length === 0) return [];

        const players: Player[] = [];
        for (const id of playerIds) {
            const player = await getPlayer(id);
            if (player) players.push(player);
        }
        return players;
    } catch (error) {
        console.error("Error getting all players from Redis:", error);
        return [];
    }
}

/**
 * Get a specific beji from Redis
 */
export async function getBeji(bejiId: string): Promise<Beji | null> {
    try {
        const client = getRedisClient();
        const data = await client.get(bejiKey(bejiId));
        if (!data) return null;
        return JSON.parse(data) as Beji;
    } catch (error) {
        console.error(`Error getting beji ${bejiId} from Redis:`, error);
        return null;
    }
}

/**
 * Save a beji to Redis
 */
export async function saveBeji(beji: Beji): Promise<boolean> {
    try {
        const client = getRedisClient();
        const multi = client.multi();
        multi.set(bejiKey(beji.id), JSON.stringify(beji));
        multi.sAdd(BEJI_KEY, beji.id);
        // Track beji by player
        multi.sAdd(`beji:player:${beji.playerId}:beji`, beji.id);
        // Track beji by world
        if (beji.worldId) {
            multi.sAdd(`beji:world:${beji.worldId}:beji`, beji.id);
        }
        await multi.exec();
        return true;
    } catch (error) {
        console.error(`Error saving beji ${beji.id} to Redis:`, error);
        return false;
    }
}

/**
 * Get all beji from Redis
 */
export async function getAllBeji(): Promise<Beji[]> {
    try {
        const client = getRedisClient();
        const bejiIds = await client.sMembers(BEJI_KEY);
        if (bejiIds.length === 0) return [];

        const beji: Beji[] = [];
        for (const id of bejiIds) {
            const b = await getBeji(id);
            if (b) beji.push(b);
        }
        return beji;
    } catch (error) {
        console.error("Error getting all beji from Redis:", error);
        return [];
    }
}

/**
 * Get beji for a specific player
 */
export async function getBejiForPlayer(playerId: string): Promise<Beji[]> {
    try {
        const client = getRedisClient();
        const bejiIds = await client.sMembers(`beji:player:${playerId}:beji`);
        if (bejiIds.length === 0) return [];

        const beji: Beji[] = [];
        for (const id of bejiIds) {
            const b = await getBeji(id);
            if (b) beji.push(b);
        }
        return beji;
    } catch (error) {
        console.error(`Error getting beji for player ${playerId} from Redis:`, error);
        return [];
    }
}

/**
 * Get a static beji from Redis
 */
export async function getStaticBeji(staticBejiId: string): Promise<StaticBeji | null> {
    try {
        const client = getRedisClient();
        const data = await client.get(staticBejiKey(staticBejiId));
        if (!data) return null;
        return JSON.parse(data) as StaticBeji;
    } catch (error) {
        console.error(`Error getting static beji ${staticBejiId} from Redis:`, error);
        return null;
    }
}

/**
 * Save a static beji to Redis
 */
export async function saveStaticBeji(staticBeji: StaticBeji): Promise<boolean> {
    try {
        const client = getRedisClient();
        const multi = client.multi();
        multi.set(staticBejiKey(staticBeji.id), JSON.stringify(staticBeji));
        multi.sAdd(STATIC_BEJI_KEY, staticBeji.id);
        // Track static beji by world
        if (staticBeji.worldId) {
            multi.sAdd(`beji:world:${staticBeji.worldId}:staticBeji`, staticBeji.id);
        }
        await multi.exec();
        return true;
    } catch (error) {
        console.error(`Error saving static beji ${staticBeji.id} to Redis:`, error);
        return false;
    }
}

/**
 * Get static beji for a specific world
 */
export async function getStaticBejiForWorld(worldId: string): Promise<StaticBeji[]> {
    try {
        const client = getRedisClient();
        const staticBejiIds = await client.sMembers(`beji:world:${worldId}:staticBeji`);
        if (staticBejiIds.length === 0) return [];

        const staticBeji: StaticBeji[] = [];
        for (const id of staticBejiIds) {
            const sb = await getStaticBeji(id);
            if (sb) staticBeji.push(sb);
        }
        return staticBeji;
    } catch (error) {
        console.error(`Error getting static beji for world ${worldId} from Redis:`, error);
        return [];
    }
}

/**
 * Get all static beji from Redis
 */
export async function getAllStaticBeji(): Promise<StaticBeji[]> {
    try {
        const client = getRedisClient();
        const staticBejiIds = await client.sMembers(STATIC_BEJI_KEY);
        if (staticBejiIds.length === 0) return [];

        const staticBeji: StaticBeji[] = [];
        for (const id of staticBejiIds) {
            const sb = await getStaticBeji(id);
            if (sb) staticBeji.push(sb);
        }
        return staticBeji;
    } catch (error) {
        console.error("Error getting all static beji from Redis:", error);
        return [];
    }
}

/**
 * Get inventory for a player
 */
export async function getInventory(playerId: string): Promise<Record<number, number>> {
    try {
        const client = getRedisClient();
        const data = await client.get(inventoryKey(playerId));
        if (!data) return {};
        return JSON.parse(data) as Record<number, number>;
    } catch (error) {
        console.error(`Error getting inventory for player ${playerId} from Redis:`, error);
        return {};
    }
}

/**
 * Save inventory for a player
 */
export async function saveInventory(
    playerId: string,
    inventory: Record<number, number>
): Promise<boolean> {
    try {
        const client = getRedisClient();
        await client.set(inventoryKey(playerId), JSON.stringify(inventory));
        return true;
    } catch (error) {
        console.error(`Error saving inventory for player ${playerId} to Redis:`, error);
        return false;
    }
}

/**
 * Update inventory item count for a player
 */
export async function updateInventoryItem(
    playerId: string,
    codepoint: number,
    delta: number
): Promise<boolean> {
    try {
        const inventory = await getInventory(playerId);
        const currentCount = inventory[codepoint] || 0;
        const newCount = Math.max(0, currentCount + delta);
        if (newCount === 0) {
            delete inventory[codepoint];
        } else {
            inventory[codepoint] = newCount;
        }
        return await saveInventory(playerId, inventory);
    } catch (error) {
        console.error(
            `Error updating inventory item ${codepoint} for player ${playerId} in Redis:`,
            error
        );
        return false;
    }
}

/**
 * Get a specific world from Redis
 */
export async function getWorld(worldId: string): Promise<World | null> {
    try {
        const client = getRedisClient();
        const data = await client.get(worldKey(worldId));
        if (!data) return null;
        return JSON.parse(data) as World;
    } catch (error) {
        console.error(`Error getting world ${worldId} from Redis:`, error);
        return null;
    }
}

/**
 * Save a world to Redis
 */
export async function saveWorld(world: World): Promise<boolean> {
    try {
        const client = getRedisClient();
        const multi = client.multi();
        multi.set(worldKey(world.id), JSON.stringify(world));
        multi.sAdd(WORLDS_KEY, world.id);
        // Track static beji for this world
        if (world.staticBejiIds && world.staticBejiIds.length > 0) {
            for (const staticBejiId of world.staticBejiIds) {
                multi.sAdd(`beji:world:${world.id}:staticBeji`, staticBejiId);
            }
        }
        await multi.exec();
        return true;
    } catch (error) {
        console.error(`Error saving world ${world.id} to Redis:`, error);
        return false;
    }
}

/**
 * Get all worlds from Redis
 */
export async function getAllWorlds(): Promise<World[]> {
    try {
        const client = getRedisClient();
        const worldIds = await client.sMembers(WORLDS_KEY);
        if (worldIds.length === 0) return [];

        const worlds: World[] = [];
        for (const id of worldIds) {
            const world = await getWorld(id);
            if (world) worlds.push(world);
        }
        return worlds;
    } catch (error) {
        console.error("Error getting all worlds from Redis:", error);
        return [];
    }
}

/**
 * Get world for a specific beji (main beji)
 */
export async function getWorldForBeji(bejiId: string): Promise<World | null> {
    try {
        const beji = await getBeji(bejiId);
        if (!beji || !beji.worldId) return null;
        return await getWorld(beji.worldId);
    } catch (error) {
        console.error(`Error getting world for beji ${bejiId} from Redis:`, error);
        return null;
    }
}

