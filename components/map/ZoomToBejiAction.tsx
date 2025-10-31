"use client";

import { useCallback, useEffect } from "react";
import { useAtomValue, useSetAtom } from "../../lib/jotai";
import { Tooltip } from "../Tooltip";
import { bejiAtom, playersAtom, zoomPxPerMeterAtom } from "../atoms";
import { registerShortcut, unregisterShortcutById, RESERVED_KEYS } from "../../src/lib/shortcuts";
import type { Beji } from "../atoms";

type ZoomToBejiActionProps = {
    currentPlayerId: string;
    setCameraOffset: (offset: { x: number; y: number }) => void;
    getPhysicsPosition: (bejiId: string) => { x: number; y: number } | undefined;
};

export function ZoomToBejiAction({ currentPlayerId, setCameraOffset, getPhysicsPosition }: ZoomToBejiActionProps) {
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

        // Use a medium zoom level that focuses on the beji (e.g., 200 px/m)
        const targetZoom = 200;
        setPixelsPerMeter(targetZoom);

        // Reset camera offset to center on the beji's current physics position
        // The cameraTarget will use beji.position, so we calculate the offset needed
        // to center on the actual physics position
        const offsetX = currentPos.x - playerBeji.position.x;
        const offsetY = currentPos.y - playerBeji.position.y;
        setCameraOffset({ x: offsetX, y: offsetY });
    }, [currentPlayerId, beji, setPixelsPerMeter, setCameraOffset, getPhysicsPosition]);

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

