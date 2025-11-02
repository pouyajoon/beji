import { atom, atomWithStorage, createJSONStorage } from "../lib/jotai";
import { detectLanguage } from '../src/lib/language';
import type { AppLocale } from '../src/i18n';

// Game State
export interface IPosition {
    x: number;
    y: number;
}

export type Player = {
    id: string;
    emoji: string;
    emojiCodepoints: number[];
    bejiIds: string[]; // List of beji IDs this player owns
    createdAt: number; // Timestamp when player was created
};

export type World = {
    id: string;
    mainBejiId: string; // The beji this world belongs to
    staticBejiIds: string[]; // List of static beji IDs in this world
    createdAt: number; // Timestamp when world was created
};

export type Beji = {
    id: string;
    playerId: string;
    worldId: string; // The world this beji exists in
    emoji: string;
    name: string;
    position: IPosition;
    target?: IPosition;
    walk: boolean;
    createdAt: number; // Timestamp when beji was created
};

export type StaticBeji = {
    id: string;
    worldId: string; // The world this static beji belongs to
    emojiCodepoint: number; // The unicode codepoint for this static beji
    emoji: string;
    position: IPosition;
    harvested: boolean; // Whether this static beji has been harvested
};

export type GameState = {
    players: Player[];
    worlds: World[];
    beji: Beji[];
    staticBeji: StaticBeji[];
    inventory: Record<string, Record<number, number>>; // Maps playerId -> codepoint -> count
};

// Atoms
const gameStorage = createJSONStorage<GameState>(() => {
    const baseStorage = localStorage;
    return {
        getItem: (key: string): string | null => {
            try {
                const value = baseStorage.getItem(key);
                if (value === null) return null;
                const parsed: any = JSON.parse(value);
                // Migrate old game state structure to new structure
                if (parsed) {
                    // Ensure all required arrays exist
                    if (!parsed.players) parsed.players = [];
                    if (!parsed.worlds) parsed.worlds = [];
                    if (!parsed.beji) parsed.beji = [];
                    if (!parsed.staticBeji) parsed.staticBeji = [];
                    if (!parsed.inventory) parsed.inventory = {};

                    // Migrate old player structure (without bejiIds)
                    if (parsed.players && Array.isArray(parsed.players)) {
                        parsed.players = parsed.players.map((p: any) => ({
                            ...p,
                            bejiIds: p.bejiIds || [],
                            createdAt: p.createdAt || Date.now(),
                        }));
                    }

                    // Migrate old beji structure (without worldId)
                    if (parsed.beji && Array.isArray(parsed.beji)) {
                        parsed.beji = parsed.beji.map((b: any) => ({
                            ...b,
                            walk: b.walk !== undefined ? b.walk : true,
                            worldId: b.worldId || '',
                            createdAt: b.createdAt || Date.now(),
                        }));
                    }

                    // Migrate old static beji structure (without worldId)
                    if (parsed.staticBeji && Array.isArray(parsed.staticBeji)) {
                        parsed.staticBeji = parsed.staticBeji.map((sb: any) => ({
                            ...sb,
                            worldId: sb.worldId || '',
                        }));
                    }

                    // Migrate old inventory structure (player-level to per-player)
                    if (parsed.inventory && !parsed.inventory[0]) {
                        // Old structure: Record<number, number>
                        // New structure: Record<playerId, Record<number, number>>
                        const oldInventory = parsed.inventory as any;
                        if (oldInventory && typeof oldInventory === 'object') {
                            const hasNumberKeys = Object.keys(oldInventory).some((k) => !isNaN(Number(k)));
                            if (hasNumberKeys && parsed.players && parsed.players.length > 0) {
                                // Migrate to first player's inventory
                                const playerId = parsed.players[0]?.id || 'default';
                                parsed.inventory = {
                                    [playerId]: oldInventory,
                                };
                            } else {
                                parsed.inventory = {};
                            }
                        }
                    }
                }
                return JSON.stringify(parsed);
            } catch {
                return null;
            }
        },
        setItem: (key: string, newValue: string): void => {
            baseStorage.setItem(key, newValue);
        },
        removeItem: (key: string): void => {
            baseStorage.removeItem(key);
        },
    };
});

export const gameStateAtom = atomWithStorage<GameState>(
    "beji:gameState",
    {
        players: [],
        worlds: [],
        beji: [],
        staticBeji: [],
        inventory: {},
    },
    gameStorage
);

export const playersAtom = atom(
    (get) => get(gameStateAtom).players,
    (get, set, update: Player[]) => {
        set(gameStateAtom, { ...get(gameStateAtom), players: update });
    }
);

export const bejiAtom = atom(
    (get) => get(gameStateAtom).beji,
    (get, set, update: Beji[]) => {
        set(gameStateAtom, { ...get(gameStateAtom), beji: update });
    }
);

export const staticBejiAtom = atom(
    (get) => get(gameStateAtom).staticBeji,
    (get, set, update: StaticBeji[]) => {
        set(gameStateAtom, { ...get(gameStateAtom), staticBeji: update });
    }
);

export const worldsAtom = atom(
    (get) => get(gameStateAtom).worlds,
    (get, set, update: World[]) => {
        set(gameStateAtom, { ...get(gameStateAtom), worlds: update });
    }
);

export const staticBejiForWorldAtom = (worldId: string) =>
    atom((get) => {
        const staticBeji = get(staticBejiAtom);
        return staticBeji.filter((sb) => sb.worldId === worldId);
    });

export const inventoryForPlayerAtom = (playerId: string) =>
    atom((get) => {
        const gameState = get(gameStateAtom);
        return gameState.inventory[playerId] || {};
    });

export const inventoryAtom = atom(
    (get) => get(gameStateAtom).inventory,
    (get, set, update: Record<string, Record<number, number>>) => {
        set(gameStateAtom, { ...get(gameStateAtom), inventory: update });
    }
);

// UI State (Home page) persisted in localStorage
const emojiStorage = createJSONStorage<number[] | null>(() => localStorage);
const nameStorage = createJSONStorage<string>(() => localStorage);

export const selectedBejiEmojiAtom = atomWithStorage<number[] | null>(
    "beji:selectedEmoji",
    null,
    emojiStorage
);

export const bejiNameAtom = atomWithStorage<string>(
    "beji:name",
    `no_name-${Math.random().toString(36).substring(2, 15)}`,
    nameStorage
);

// Auth state
export const userSubAtom = atomWithStorage<string | null>(
    "beji:userSub",
    null,
    createJSONStorage<string | null>(() => localStorage)
);

// Zoom state (Canvas/SVG) persisted in localStorage
const zoomStorage = createJSONStorage<number>(() => localStorage);
export const zoomPxPerMeterAtom = atomWithStorage<number>(
    "beji:zoomPxPerMeter",
    100,
    zoomStorage
);

// Language state persisted in localStorage
const languageStorage = createJSONStorage<AppLocale>(() => localStorage);
export const languageAtom = atomWithStorage<AppLocale>(
    "beji:language",
    typeof window !== 'undefined' ? detectLanguage() : 'en',
    languageStorage
);

// Follow mouse state persisted in localStorage
const followMouseStorage = createJSONStorage<boolean>(() => localStorage);
export const followMouseAtom = atomWithStorage<boolean>(
    "beji:followMouse",
    true,
    followMouseStorage
);

