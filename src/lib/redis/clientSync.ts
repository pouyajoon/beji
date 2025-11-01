import type { GameState, Player, Beji, StaticBeji, World } from "../../../components/atoms";

/**
 * Client-side utilities for syncing game state with Redis via API routes
 */

const API_BASE = "/api";

export async function fetchGameState(): Promise<GameState | null> {
    try {
        const response = await fetch(`${API_BASE}/game-state`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as GameState;
    } catch (error) {
        console.error("Error fetching game state:", error);
        return null;
    }
}

export async function saveGameStateToServer(state: GameState): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/game-state`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(state),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = (await response.json()) as { success: boolean };
        return result.success;
    } catch (error) {
        console.error("Error saving game state:", error);
        return false;
    }
}

export async function fetchPlayer(playerId: string): Promise<Player | null> {
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as Player;
    } catch (error) {
        console.error(`Error fetching player ${playerId}:`, error);
        return null;
    }
}

export async function savePlayerToServer(player: Player): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/players`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(player),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error saving player ${player.id}:`, error);
        return false;
    }
}

export async function updatePlayerOnServer(player: Player): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/players/${player.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(player),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error updating player ${player.id}:`, error);
        return false;
    }
}

export async function fetchBeji(bejiId: string): Promise<Beji | null> {
    try {
        const response = await fetch(`${API_BASE}/beji/${bejiId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as Beji;
    } catch (error) {
        console.error(`Error fetching beji ${bejiId}:`, error);
        return null;
    }
}

export async function fetchBejiForPlayer(playerId: string): Promise<Beji[]> {
    try {
        const response = await fetch(`${API_BASE}/beji?playerId=${encodeURIComponent(playerId)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as Beji[];
    } catch (error) {
        console.error(`Error fetching beji for player ${playerId}:`, error);
        return [];
    }
}

export async function saveBejiToServer(beji: Beji): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/beji`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(beji),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error saving beji ${beji.id}:`, error);
        return false;
    }
}

export async function updateBejiOnServer(beji: Beji): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/beji/${beji.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(beji),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error updating beji ${beji.id}:`, error);
        return false;
    }
}

export async function fetchInventory(playerId: string): Promise<Record<number, number>> {
    try {
        const response = await fetch(`${API_BASE}/inventory/${playerId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as Record<number, number>;
    } catch (error) {
        console.error(`Error fetching inventory for player ${playerId}:`, error);
        return {};
    }
}

export async function updateInventoryOnServer(
    playerId: string,
    inventory: Record<number, number>
): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/inventory/${playerId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(inventory),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error updating inventory for player ${playerId}:`, error);
        return false;
    }
}

export async function updateInventoryItemOnServer(
    playerId: string,
    codepoint: number,
    delta: number
): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/inventory/${playerId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ codepoint, delta }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(
            `Error updating inventory item ${codepoint} for player ${playerId}:`,
            error
        );
        return false;
    }
}

export async function fetchStaticBeji(staticBejiId: string): Promise<StaticBeji | null> {
    try {
        const response = await fetch(`${API_BASE}/static-beji?id=${encodeURIComponent(staticBejiId)}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as StaticBeji;
    } catch (error) {
        console.error(`Error fetching static beji ${staticBejiId}:`, error);
        return null;
    }
}

export async function fetchAllStaticBeji(): Promise<StaticBeji[]> {
    try {
        const response = await fetch(`${API_BASE}/static-beji`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as StaticBeji[];
    } catch (error) {
        console.error("Error fetching all static beji:", error);
        return [];
    }
}

export async function saveStaticBejiToServer(staticBeji: StaticBeji): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/static-beji`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(staticBeji),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error saving static beji ${staticBeji.id}:`, error);
        return false;
    }
}

export async function fetchWorld(worldId: string): Promise<World | null> {
    try {
        const response = await fetch(`${API_BASE}/worlds/${worldId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as World;
    } catch (error) {
        console.error(`Error fetching world ${worldId}:`, error);
        return null;
    }
}

export async function fetchAllWorlds(): Promise<World[]> {
    try {
        const response = await fetch(`${API_BASE}/worlds`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as World[];
    } catch (error) {
        console.error("Error fetching all worlds:", error);
        return [];
    }
}

export async function saveWorldToServer(world: World): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/worlds`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(world),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error saving world ${world.id}:`, error);
        return false;
    }
}

export async function fetchWorldWithStaticBeji(worldId: string): Promise<StaticBeji[]> {
    try {
        const response = await fetch(`${API_BASE}/worlds/${worldId}?includeStaticBeji=true`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as StaticBeji[];
    } catch (error) {
        console.error(`Error fetching world ${worldId} with static beji:`, error);
        return [];
    }
}

