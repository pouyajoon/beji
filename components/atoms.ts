import { atom, atomWithStorage, createJSONStorage } from "../lib/jotai";

// Game State
export type Player = {
    id: string;
    emoji: string;
    emojiCodepoints: number[];
};

export type Beji = {
    id: string;
    playerId: string;
    emoji: string;
    name: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
};

export type GameState = {
    players: Player[];
    beji: Beji[];
};

// Atoms
const gameStorage = createJSONStorage<GameState>(() => localStorage);

export const gameStateAtom = atomWithStorage<GameState>(
    "beji:gameState",
    {
        players: [],
        beji: [],
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

export const bejiForPlayerAtom = (playerId: string) =>
    atom((get) => {
        const beji = get(bejiAtom);
        return beji.filter((b) => b.playerId === playerId);
    });

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
    "",
    nameStorage
);

