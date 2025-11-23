"use client";

import type { Beji } from "../atoms";
import { InventoryDisplay } from "./InventoryDisplay";
import { ToggleFollowMouseAction } from "./ToggleFollowMouseAction";
import { ZoomToBejiAction } from "./ZoomToBejiAction";
import UserMenu from "../UserMenu";

type ActionsBarProps = {
    followMouse: boolean;
    onToggleFollowMouse: (value: boolean) => void;
    currentPlayerId: string;
    setCameraOffset: (offset: { x: number; y: number }) => void;
    getPhysicsPosition: (bejiId: string) => { x: number; y: number } | undefined;
    setBeji: (beji: Beji[]) => void;
};

export function ActionsBar({
    followMouse,
    onToggleFollowMouse,
    currentPlayerId,
    setCameraOffset,
    getPhysicsPosition,
    setBeji,
}: ActionsBarProps) {
    return (
        <div style={{ 
            position: "sticky", 
            top: 0, 
            zIndex: 10, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "flex-start", 
            gap: 12, 
            padding: "8px 12px", 
            background: "#ffffff", 
            borderBottom: "1px solid #e5e7eb" 
        }}>
            <ToggleFollowMouseAction 
                followMouse={followMouse} 
                onToggle={onToggleFollowMouse} 
            />
            <ZoomToBejiAction 
                currentPlayerId={currentPlayerId}
                setCameraOffset={setCameraOffset}
                getPhysicsPosition={getPhysicsPosition}
                setBeji={setBeji}
            />
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                <InventoryDisplay />
                <UserMenu />
            </div>
            {/* All debug is drawn on canvas */}
        </div>
    );
}

