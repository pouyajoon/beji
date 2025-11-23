import { getRedisClient } from "./client";
import type { User, Player, Beji, StaticBeji, World } from "../../../components/atoms";

const USERS_KEY = "beji:users";
const PLAYERS_KEY = "beji:players";
const WORLDS_KEY = "beji:worlds";
const BEJI_KEY = "beji:beji";
const STATIC_BEJI_KEY = "beji:staticBeji";

// Key helpers
function userKey(userId: string): string {
    return `beji:user:${userId}`;
}

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


/**
 * Get a specific user from Redis
 */
export async function getUser(userId: string): Promise<User | null> {
    try {
        const client = getRedisClient();
        const data = await client.get(userKey(userId));
        if (!data) return null;
        return JSON.parse(data) as User;
    } catch (error) {
        console.error(`Error getting user ${userId} from Redis:`, error);
        return null;
    }
}

/**
 * Save a user to Redis
 */
export async function saveUser(user: User): Promise<boolean> {
    try {
        const client = getRedisClient();
        const multi = client.multi();
        multi.set(userKey(user.id), JSON.stringify(user));
        multi.sAdd(USERS_KEY, user.id);
        await multi.exec();
        return true;
    } catch (error) {
        console.error(`Error saving user ${user.id} to Redis:`, error);
        return false;
    }
}

/**
 * Get or create a user in Redis
 */
export async function getOrCreateUser(userId: string, email: string, picture?: string, name?: string): Promise<User> {
    let user = await getUser(userId);
    if (!user) {
        const now = Date.now();
        user = {
            id: userId,
            email,
            picture,
            name,
            createdAt: now,
            lastLoginAt: now,
        };
        await saveUser(user);
    } else {
        // Update lastLoginAt
        user.lastLoginAt = Date.now();
        if (picture && !user.picture) user.picture = picture;
        if (name && !user.name) user.name = name;
        await saveUser(user);
    }
    return user;
}

/**
 * Get all player IDs for a user
 */
export async function getPlayerIdsForUser(userId: string): Promise<string[]> {
    try {
        const client = getRedisClient();
        const playerIds = await client.sMembers(`beji:user:${userId}:players`);
        return playerIds || [];
    } catch (error) {
        console.error(`Error getting player IDs for user ${userId} from Redis:`, error);
        return [];
    }
}

/**
 * Get all bejis for a user (across all their players)
 */
export async function getBejisForUser(userId: string): Promise<Beji[]> {
    try {
        const playerIds = await getPlayerIdsForUser(userId);
        if (playerIds.length === 0) return [];

        const allBejis: Beji[] = [];
        for (const playerId of playerIds) {
            const bejis = await getBejiForPlayer(playerId);
            allBejis.push(...bejis);
        }

        // Sort by creation time (most recent first)
        allBejis.sort((a, b) => b.createdAt - a.createdAt);
        return allBejis;
    } catch (error) {
        console.error(`Error getting bejis for user ${userId} from Redis:`, error);
        return [];
    }
}

/**
 * Add a player to a user's player list
 */
export async function addPlayerToUser(userId: string, playerId: string): Promise<boolean> {
    try {
        const client = getRedisClient();
        await client.sAdd(`beji:user:${userId}:players`, playerId);
        return true;
    } catch (error) {
        console.error(`Error adding player ${playerId} to user ${userId} in Redis:`, error);
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
        // Add player to user's player list
        if (player.userId) {
            multi.sAdd(`beji:user:${player.userId}:players`, player.id);
        }
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
 * Update beji position and target in Redis
 */
export async function updateBejiPosition(
    bejiId: string,
    position: { x: number; y: number },
    target?: { x: number; y: number },
    walk?: boolean
): Promise<boolean> {
    try {
        const beji = await getBeji(bejiId);
        if (!beji) {
            console.error(`Beji ${bejiId} not found for position update`);
            return false;
        }

        const updated: Beji = {
            ...beji,
            position,
            target: target ?? beji.target,
            walk: walk !== undefined ? walk : beji.walk,
        };

        return await saveBeji(updated);
    } catch (error) {
        console.error(`Error updating beji position ${bejiId} in Redis:`, error);
        return false;
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
async function getStaticBeji(staticBejiId: string): Promise<StaticBeji | null> {
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
 * @deprecated Use getPlayerIdsForUser instead - users can have multiple players
 * Get the first player ID for a given user ID (for backward compatibility)
 */
export async function getPlayerIdForUser(userId: string): Promise<string | null> {
    try {
        const playerIds = await getPlayerIdsForUser(userId);
        const firstPlayerId = playerIds.length > 0 ? playerIds[0] : undefined;
        return firstPlayerId ?? null;
    } catch (error) {
        console.error(`Error getting player ID for user ${userId} from Redis:`, error);
        return null;
    }
}


