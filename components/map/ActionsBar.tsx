"use client";

import { ToggleFollowMouseAction } from "./ToggleFollowMouseAction";
import { ZoomToBejiAction } from "./ZoomToBejiAction";

type ActionsBarProps = {
    followMouse: boolean;
    onToggleFollowMouse: (value: boolean) => void;
    currentPlayerId: string;
    setCameraOffset: (offset: { x: number; y: number }) => void;
    getPhysicsPosition: (bejiId: string) => { x: number; y: number } | undefined;
};

export function ActionsBar({
    followMouse,
    onToggleFollowMouse,
    currentPlayerId,
    setCameraOffset,
    getPhysicsPosition,
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
            />
            {/* All debug is drawn on canvas */}
        </div>
    );
}

