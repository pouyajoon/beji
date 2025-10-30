"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import type { Beji } from "./atoms";
import { bejiAtom, bejiForPlayerAtom, currentPlayerIdAtom } from "./atoms";
import { useKeyboardMovement } from "../hooks/useKeyboardMovement";
import { VirtualJoystick } from "./VirtualJoystick";

const MAP_SIZE = 800;
const CELL_SIZE = 40;
const GRID_COLUMNS = MAP_SIZE / CELL_SIZE;
const GRID_ROWS = MAP_SIZE / CELL_SIZE;

type MapCell = {
    x: number;
    y: number;
};

function MapGrid({ cells }: { cells: MapCell[] }) {
    return (
        <g>
            {cells.map((cell, idx) => (
                <rect
                    key={idx}
                    x={cell.x}
                    y={cell.y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill="#f9fafb"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                />
            ))}
        </g>
    );
}

function BejiSprite({ beji, playerId }: { beji: Beji; playerId: string }) {
    const [position, setPosition] = useState({ x: beji.x, y: beji.y });
    const [target, setTarget] = useState({ x: beji.targetX, y: beji.targetY });

    useEffect(() => {
        setTarget({ x: beji.targetX, y: beji.targetY });
    }, [beji.targetX, beji.targetY]);

    useEffect(() => {
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) {
            setPosition(target);
            return;
        }

        const stepSize = Math.min(5, distance);
        const stepX = (dx / distance) * stepSize;
        const stepY = (dy / distance) * stepSize;

        const timer = requestAnimationFrame(() => {
            setPosition((prev) => ({
                x: prev.x + stepX,
                y: prev.y + stepY,
            }));
        });

        return () => cancelAnimationFrame(timer);
    }, [position.x, position.y, target.x, target.y]);

    const isMoving =
        Math.abs(position.x - target.x) > 1 || Math.abs(position.y - target.y) > 1;

    return (
        <g>
            <circle
                cx={beji.x}
                cy={beji.y}
                r={CELL_SIZE * 0.2}
                fill={playerId === beji.playerId ? "#3b82f6" : "#ef4444"}
                opacity="0.2"
            />
            <g
                transform={`translate(${position.x}, ${position.y})`}
                style={{ transition: isMoving ? "transform 0.1s linear" : "none" }}
            >
                <foreignObject
                    x={-CELL_SIZE / 2}
                    y={-CELL_SIZE / 2}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            fontSize: CELL_SIZE * 0.7,
                            userSelect: "none",
                        }}
                    >
                        {beji.emoji}
                    </div>
                </foreignObject>
            </g>
        </g>
    );
}

export function Map() {
    const currentPlayerId = useAtomValue(currentPlayerIdAtom);
    const [beji, setBeji] = useAtom(bejiAtom);
    const playerBeji = useAtomValue(bejiForPlayerAtom(currentPlayerId || ""));

    // Generate grid cells
    const gridCells: MapCell[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLUMNS; col++) {
            gridCells.push({ x: col * CELL_SIZE, y: row * CELL_SIZE });
        }
    }

    const moveCurrentPlayerBeji = (dx: number, dy: number) => {
        if (!currentPlayerId) return;
        setBeji(
            beji.map((b) => {
                if (b.playerId === currentPlayerId) {
                    const newTargetX = Math.max(
                        CELL_SIZE / 2,
                        Math.min(MAP_SIZE - CELL_SIZE / 2, b.targetX + dx)
                    );
                    const newTargetY = Math.max(
                        CELL_SIZE / 2,
                        Math.min(MAP_SIZE - CELL_SIZE / 2, b.targetY + dy)
                    );
                    return { ...b, targetX: newTargetX, targetY: newTargetY };
                }
                return b;
            })
        );
    };

    useKeyboardMovement((dx, dy) => moveCurrentPlayerBeji(dx, dy), {
        enabled: !!currentPlayerId,
        stepSize: CELL_SIZE,
    });

    const isTouchPreferred = useMemo(() => {
        if (typeof window === "undefined") return false;
        const mq = window.matchMedia("(pointer: coarse)");
        return mq.matches;
    }, []);

    const handleMapClick = (e: React.MouseEvent<SVGElement>) => {
        if (!currentPlayerId) return;

        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * MAP_SIZE;
        const y = ((e.clientY - rect.top) / rect.height) * MAP_SIZE;

        // Round to nearest grid cell center
        const cellCol = Math.round((x - CELL_SIZE / 2) / CELL_SIZE);
        const cellRow = Math.round((y - CELL_SIZE / 2) / CELL_SIZE);
        const targetX = Math.max(CELL_SIZE / 2, Math.min(MAP_SIZE - CELL_SIZE / 2, cellCol * CELL_SIZE));
        const targetY = Math.max(CELL_SIZE / 2, Math.min(MAP_SIZE - CELL_SIZE / 2, cellRow * CELL_SIZE));

        // Update beji target positions for current player
        setBeji(
            beji.map((b) =>
                b.playerId === currentPlayerId
                    ? { ...b, targetX, targetY }
                    : b
            )
        );
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
                style={{
                    fontSize: 14,
                    color: "#6b7280",
                    textAlign: "center",
                }}
            >
                {currentPlayerId
                    ? `Use arrow keys or click to move your ${playerBeji.length} beji`
                    : "Select an emoji to start playing"}
            </div>
            <svg
                width={MAP_SIZE}
                height={MAP_SIZE}
                viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
                style={{
                    border: "2px solid #e5e7eb",
                    cursor: currentPlayerId ? "pointer" : "default",
                    background: "#ffffff",
                }}
                onClick={handleMapClick}
            >
                <MapGrid cells={gridCells} />
                {beji.map((b) => (
                    <BejiSprite key={b.id} beji={b} playerId={currentPlayerId || ""} />
                ))}
            </svg>
            {currentPlayerId && isTouchPreferred && (
                <VirtualJoystick
                    onVector={(vx: number, vy: number) => {
                        const magnitude = Math.hypot(vx, vy);
                        if (magnitude < 0.25) return;
                        // Throttle steps using requestAnimationFrame loop managed inside component via onHold
                        // Map to grid step direction
                        const dirX = Math.abs(vx) > 0.3 ? Math.sign(vx) : 0;
                        const dirY = Math.abs(vy) > 0.3 ? Math.sign(vy) : 0;
                        if (dirX !== 0 || dirY !== 0) {
                            moveCurrentPlayerBeji(dirX * CELL_SIZE, dirY * CELL_SIZE);
                        }
                    }}
                />
            )}
            {currentPlayerId && playerBeji.length > 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                    {playerBeji.map((b) => (
                        <span key={b.id} style={{ marginRight: 8 }}>
                            {b.name}: {b.emoji}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

