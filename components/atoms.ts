import { atom, atomWithStorage, createJSONStorage } from "../lib/jotai";

// Game State
export type Player = {
    id: string;
    emoji: string;
    emojiCodepoints: number[];
};

export interface IPosition {
    x: number;
    y: number;
}

export type Beji = {
    id: string;
    playerId: string;
    emoji: string;
    name: string;
    position: IPosition;
    target: IPosition;
    walk: boolean;
};

export type GameState = {
    players: Player[];
    beji: Beji[];
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
                // Ensure Beji objects have walk property
                if (parsed && parsed.beji && Array.isArray(parsed.beji)) {
                    parsed.beji = parsed.beji.map((b: any) => ({
                        ...b,
                        walk: b.walk !== undefined ? b.walk : true,
                    }));
                }
                return value;
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
    `no_name-${Math.random().toString(36).substring(2, 15)}`,
    nameStorage
);

// Zoom state (Canvas/SVG) persisted in localStorage
const zoomStorage = createJSONStorage<number>(() => localStorage);
export const zoomPxPerMeterAtom = atomWithStorage<number>(
    "beji:zoomPxPerMeter",
    100,
    zoomStorage
);

