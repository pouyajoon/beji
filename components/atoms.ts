import { atom, atomWithStorage, createJSONStorage } from "../lib/jotai";
import type { AppLocale } from '../src/i18n';
import { detectLanguage } from '../src/lib/language';

// Game State
export interface IPosition {
    x: number;
    y: number;
}

export type User = {
    id: string; // Google userId (sub)
    email: string;
    picture?: string;
    name?: string;
    createdAt: number; // Timestamp when user was created
    lastLoginAt: number; // Timestamp of last login
};

export type Player = {
    id: string;
    userId?: string; // Reference to User.id (optional for backward compatibility with old data)
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

// Types for old structures (before migration)
type OldPlayer = Partial<Player> & {
    id: string;
    emoji: string;
    emojiCodepoints: number[];
};

type OldBeji = Partial<Beji> & {
    id: string;
    playerId: string;
    emoji: string;
    name: string;
    position: IPosition;
};

type OldStaticBeji = Partial<StaticBeji> & {
    id: string;
    emojiCodepoint: number;
    emoji: string;
    position: IPosition;
};

type OldGameState = {
    players?: OldPlayer[];
    worlds?: World[];
    beji?: OldBeji[];
    staticBeji?: OldStaticBeji[];
    inventory?: Record<number, number> | Record<string, Record<number, number>>;
};

// Type guards
function isGameState(obj: unknown): obj is GameState {
    if (!obj || typeof obj !== 'object') return false;
    const state = obj as Record<string, unknown>;
    return (
        Array.isArray(state.players) &&
        Array.isArray(state.worlds) &&
        Array.isArray(state.beji) &&
        Array.isArray(state.staticBeji) &&
        typeof state.inventory === 'object' &&
        state.inventory !== null &&
        !Array.isArray(state.inventory)
    );
}

function isOldInventoryStructure(inv: unknown): inv is Record<number, number> {
    if (!inv || typeof inv !== 'object' || Array.isArray(inv)) return false;
    const keys = Object.keys(inv);
    return keys.length > 0 && keys.every((k) => !isNaN(Number(k)));
}

function isOldPlayer(player: unknown): player is OldPlayer {
    if (!player || typeof player !== 'object') return false;
    const p = player as Record<string, unknown>;
    return (
        typeof p.id === 'string' &&
        typeof p.emoji === 'string' &&
        Array.isArray(p.emojiCodepoints)
    );
}

function isOldBeji(beji: unknown): beji is OldBeji {
    if (!beji || typeof beji !== 'object') return false;
    const b = beji as Record<string, unknown>;
    const position = b.position;
    const hasValidPosition =
        position !== null &&
        position !== undefined &&
        typeof position === 'object' &&
        typeof (position as IPosition).x === 'number' &&
        typeof (position as IPosition).y === 'number';
    return (
        typeof b.id === 'string' &&
        typeof b.playerId === 'string' &&
        typeof b.emoji === 'string' &&
        typeof b.name === 'string' &&
        hasValidPosition
    );
}

function isOldStaticBeji(staticBeji: unknown): staticBeji is OldStaticBeji {
    if (!staticBeji || typeof staticBeji !== 'object') return false;
    const sb = staticBeji as Record<string, unknown>;
    const position = sb.position;
    return (
        typeof sb.id === 'string' &&
        typeof sb.emojiCodepoint === 'number' &&
        typeof sb.emoji === 'string' &&
        position !== null &&
        position !== undefined &&
        typeof position === 'object' &&
        typeof (position as IPosition).x === 'number' &&
        typeof (position as IPosition).y === 'number'
    );
}

// Atoms
const gameStorage = createJSONStorage<GameState>(() => {
    const baseStorage = localStorage;
    return {
        getItem: (key: string): string | null => {
            try {
                const value = baseStorage.getItem(key);
                if (value === null) return null;
                const parsed = JSON.parse(value);

                // If already valid GameState, return as-is
                if (isGameState(parsed)) {
                    return JSON.stringify(parsed);
                }

                // Otherwise, migrate from old structure
                if (parsed && typeof parsed === 'object') {
                    const oldState = parsed as OldGameState;
                    const migratedState: GameState = {
                        players: (oldState.players || []).map((p): Player => {
                            if (isOldPlayer(p)) {
                                return {
                                    id: p.id,
                                    userId: p.userId,
                                    emoji: p.emoji,
                                    emojiCodepoints: p.emojiCodepoints,
                                    bejiIds: p.bejiIds || [],
                                    createdAt: p.createdAt || Date.now(),
                                };
                            }
                            // Fallback for invalid player data
                            return {
                                id: '',
                                emoji: '',
                                emojiCodepoints: [],
                                bejiIds: [],
                                createdAt: Date.now(),
                            };
                        }),
                        worlds: oldState.worlds || [],
                        beji: (oldState.beji || []).map((b): Beji => {
                            if (isOldBeji(b)) {
                                return {
                                    id: b.id,
                                    playerId: b.playerId,
                                    worldId: b.worldId || '',
                                    emoji: b.emoji,
                                    name: b.name,
                                    position: b.position,
                                    target: b.target,
                                    walk: b.walk !== undefined ? b.walk : true,
                                    createdAt: b.createdAt || Date.now(),
                                };
                            }
                            // Fallback for invalid beji data
                            return {
                                id: '',
                                playerId: '',
                                worldId: '',
                                emoji: '',
                                name: '',
                                position: { x: 0, y: 0 },
                                walk: true,
                                createdAt: Date.now(),
                            };
                        }),
                        staticBeji: (oldState.staticBeji || []).map((sb): StaticBeji => {
                            if (isOldStaticBeji(sb)) {
                                return {
                                    id: sb.id,
                                    worldId: sb.worldId || '',
                                    emojiCodepoint: sb.emojiCodepoint,
                                    emoji: sb.emoji,
                                    position: sb.position,
                                    harvested: sb.harvested || false,
                                };
                            }
                            // Fallback for invalid static beji data
                            return {
                                id: '',
                                worldId: '',
                                emojiCodepoint: 0x1f600,
                                emoji: '😀',
                                position: { x: 0, y: 0 },
                                harvested: false,
                            };
                        }),
                        inventory: (() => {
                            if (!oldState.inventory) return {};
                            if (isOldInventoryStructure(oldState.inventory)) {
                                // Migrate old inventory structure to new structure
                                const firstPlayerId = oldState.players?.[0]?.id || 'default';
                                return {
                                    [firstPlayerId]: oldState.inventory,
                                };
                            }
                            // Already in new structure
                            return oldState.inventory as Record<string, Record<number, number>>;
                        })(),
                    };
                    return JSON.stringify(migratedState);
                }
                // Invalid data, return empty state
                const emptyState: GameState = {
                    players: [],
                    worlds: [],
                    beji: [],
                    staticBeji: [],
                    inventory: {},
                };
                return JSON.stringify(emptyState);
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

const gameStateAtom = atomWithStorage<GameState>(
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

