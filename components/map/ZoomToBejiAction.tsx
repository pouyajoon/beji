"use client";

import { useCallback, useEffect } from "react";

import { useAtomValue, useSetAtom } from "../../lib/jotai";
import { registerShortcut, unregisterShortcutById, RESERVED_KEYS } from "../../src/lib/shortcuts";
import { bejiAtom, playersAtom, zoomPxPerMeterAtom } from "../atoms";
import type { Beji } from "../atoms";
import { Tooltip } from "../Tooltip";

type ZoomToBejiActionProps = {
    currentPlayerId: string;
    setCameraOffset: (offset: { x: number; y: number }) => void;
    getPhysicsPosition: (bejiId: string) => { x: number; y: number } | undefined;
    setBeji: (beji: Beji[]) => void;
};

export function ZoomToBejiAction({ currentPlayerId, setCameraOffset, getPhysicsPosition, setBeji }: ZoomToBejiActionProps) {
    const beji = useAtomValue(bejiAtom);
    const players = useAtomValue(playersAtom);
    const setPixelsPerMeter = useSetAtom(zoomPxPerMeterAtom);

    // Get current player's emoji
    const currentPlayerEmoji = players[0]?.emoji ?? "👤";

    // Zoom to beji handler
    const handleZoomToBeji = useCallback(() => {
        if (!currentPlayerId) return;
        const playerBeji = beji.find((b: Beji) => b.playerId === currentPlayerId);
        if (!playerBeji) return;

        // Get current physics position (actual rendered position)
        const physicsPos = getPhysicsPosition(playerBeji.id);
        const currentPos = physicsPos ?? { x: playerBeji.position.x, y: playerBeji.position.y };

        // Update beji position to match physics position so camera centers correctly
        const updated: Beji[] = beji.map((b: Beji) => (
            b.playerId === currentPlayerId
                ? { ...b, position: { x: currentPos.x, y: currentPos.y } }
                : b
        ));
        setBeji(updated);

        // Use a medium zoom level that focuses on the beji (e.g., 200 px/m)
        const targetZoom = 200;
        setPixelsPerMeter(targetZoom);

        // Reset camera offset to center on the beji
        setCameraOffset({ x: 0, y: 0 });
    }, [currentPlayerId, beji, setPixelsPerMeter, setCameraOffset, getPhysicsPosition, setBeji]);

    // Register keyboard shortcut
    useEffect(() => {
        // Avoid using reserved arrow keys
        if (RESERVED_KEYS.has("z")) return;
        registerShortcut({
            id: "zoom-to-beji",
            key: "z",
            description: "Zoom to beji",
            preventDefault: true,
            handler: () => handleZoomToBeji(),
        });
        return () => unregisterShortcutById("zoom-to-beji");
    }, [handleZoomToBeji]);

    return (
        <Tooltip label="Zoom to beji • Shortcut: Z">
            <button
                type="button"
                aria-label="Zoom to beji"
                onClick={handleZoomToBeji}
                style={{
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#0f172a",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                }}
            >
                {currentPlayerEmoji}
            </button>
        </Tooltip>
    );
}

