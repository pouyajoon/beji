import { useEffect, useRef } from "react";
import { useAtomValue } from "../lib/jotai";
import { gameStateAtom, bejiAtom, playersAtom, staticBejiAtom, inventoryAtom } from "../components/atoms";
import {
    saveGameStateToServer,
    saveBejiToServer,
    updateBejiOnServer,
    savePlayerToServer,
    updatePlayerOnServer,
    updateInventoryOnServer,
} from "../src/lib/redis/clientSync";
import type { GameState, Beji, Player } from "../components/atoms";

interface UseRedisSyncOptions {
    enabled?: boolean;
    debounceMs?: number;
    syncOnMount?: boolean;
}

/**
 * Hook to automatically sync game state atoms with Redis via API routes
 * Debounces updates to avoid excessive API calls
 */
export function useRedisSync(options: UseRedisSyncOptions = {}): void {
    const {
        enabled = true,
        debounceMs = 1000,
        syncOnMount = false,
    } = options;

    const gameState = useAtomValue(gameStateAtom);
    const beji = useAtomValue(bejiAtom);
    const players = useAtomValue(playersAtom);
    const staticBeji = useAtomValue(staticBejiAtom);
    const inventory = useAtomValue(inventoryAtom);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousStateRef = useRef<GameState | null>(null);

    useEffect(() => {
        if (!enabled) return;

        // Skip initial mount unless syncOnMount is true
        if (!syncOnMount && previousStateRef.current === null) {
            previousStateRef.current = gameState;
            return;
        }

        // Debounce the sync
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            // Sync full game state (simpler but less efficient)
            const gameState = get(gameStateAtom);
            const currentState: GameState = {
                players,
                worlds: gameState.worlds,
                beji,
                staticBeji,
                inventory,
            };

            const previousState = previousStateRef.current;
            if (previousState && JSON.stringify(previousState) === JSON.stringify(currentState)) {
                return; // No changes
            }

            await saveGameStateToServer(currentState);
            previousStateRef.current = currentState;
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, debounceMs, syncOnMount, gameState, beji, players, staticBeji, inventory]);
}

/**
 * Hook to sync individual beji changes to Redis
 */
export function useBejiSync(beji: Beji, options: { enabled?: boolean; debounceMs?: number } = {}): void {
    const { enabled = true, debounceMs = 500 } = options;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousBejiRef = useRef<string | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const bejiJson = JSON.stringify(beji);
        if (previousBejiRef.current === bejiJson) {
            return; // No changes
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            const exists = previousBejiRef.current !== null;
            if (exists) {
                await updateBejiOnServer(beji);
            } else {
                await saveBejiToServer(beji);
            }
            previousBejiRef.current = bejiJson;
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, debounceMs, beji]);
}

/**
 * Hook to sync player changes to Redis
 */
export function usePlayerSync(player: Player, options: { enabled?: boolean; debounceMs?: number } = {}): void {
    const { enabled = true, debounceMs = 500 } = options;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousPlayerRef = useRef<string | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const playerJson = JSON.stringify(player);
        if (previousPlayerRef.current === playerJson) {
            return; // No changes
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            const exists = previousPlayerRef.current !== null;
            if (exists) {
                await updatePlayerOnServer(player);
            } else {
                await savePlayerToServer(player);
            }
            previousPlayerRef.current = playerJson;
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, debounceMs, player]);
}

