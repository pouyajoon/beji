import { atom, atomWithStorage, createJSONStorage, type Atom } from "../lib/jotai";
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
    userId?: string; // Reference to User.id
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
const gameStorage = createJSONStorage<GameState>(() => localStorage);

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

export const staticBejiForWorldAtom = (worldId: string): Atom<StaticBeji[]> =>
    atom((get) => {
        const staticBeji = get(staticBejiAtom);
        return staticBeji.filter((sb) => sb.worldId === worldId);
    });

export const inventoryForPlayerAtom = (playerId: string): Atom<Record<number, number>> =>
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

