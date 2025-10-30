"use client";

import { useAtomValue, useSetAtom } from "../lib/jotai";
import { useEffect, useMemo, useState } from "react";
import { MapGrid } from "./MapGrid";
import type { Beji } from "./atoms";
import { bejiAtom, playersAtom } from "./atoms";
import { useKeyboardMovement } from "../hooks/useKeyboardMovement";
import { VirtualJoystick } from "./VirtualJoystick";

const MAP_SIZE = 800;
const CELL_SIZE = 40;


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
    const beji = useAtomValue(bejiAtom);
    const players = useAtomValue(playersAtom);
    const setBeji = useSetAtom(bejiAtom);
    const currentPlayerId = players[0]?.id ?? "";

    // Track viewport size to compute responsive viewBox
    // IMPORTANT: initialize with static values so SSR and first client render match
    const [viewport, setViewport] = useState<{ width: number; height: number }>(() => ({
        width: 800,
        height: 800,
    }));

    useEffect(() => {
        function handleResize() {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
        }
        if (typeof window !== "undefined") {
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    // Grid cells are rendered by MapGrid component

    // Movement: keyboard and touch joystick update current player's beji target
    function clamp(value: number, min: number, max: number) {
        return Math.max(min, Math.min(max, value));
    }

    const stepBy = (dx: number, dy: number) => {
        if (!currentPlayerId) return;
        const updated: Beji[] = beji.map((b: Beji) => {
            if (b.playerId !== currentPlayerId) return b;
            const nextTargetX = clamp(b.targetX + dx, 0, MAP_SIZE);
            const nextTargetY = clamp(b.targetY + dy, 0, MAP_SIZE);
            return { ...b, targetX: nextTargetX, targetY: nextTargetY };
        });
        setBeji(updated);
    };

    useKeyboardMovement((dx, dy) => stepBy(dx, dy), { enabled: true, stepSize: CELL_SIZE });

    const isTouchPreferred = useMemo(() => {
        if (typeof window === "undefined") return false;
        const mq = window.matchMedia("(pointer: coarse)");
        return mq.matches;
    }, []);

    // Joystick on touch: periodic small steps in the direction vector

    // Camera: center on current player's beji if available
    const cameraTarget = useMemo(() => {
        const focus = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : beji[0];
        return focus ? { x: focus.x, y: focus.y } : { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
    }, [beji, currentPlayerId]);

    // Determine viewBox dimensions to follow target and fill screen across devices
    const aspect = viewport.width / Math.max(1, viewport.height);
    const baseViewSize = 400; // world units visible along the smaller screen dimension
    const viewWidth = Math.min(MAP_SIZE, aspect >= 1 ? baseViewSize * aspect : baseViewSize);
    const viewHeight = Math.min(MAP_SIZE, aspect >= 1 ? baseViewSize : baseViewSize / aspect);

    const viewX = Math.max(0, Math.min(MAP_SIZE - viewWidth, cameraTarget.x - viewWidth / 2));
    const viewY = Math.max(0, Math.min(MAP_SIZE - viewHeight, cameraTarget.y - viewHeight / 2));

    // Avoid hydration mismatch: render a deterministic viewBox on the server and first client paint
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const renderViewX = mounted ? viewX : 0;
    const renderViewY = mounted ? viewY : 0;
    const renderViewWidth = mounted ? viewWidth : MAP_SIZE;
    const renderViewHeight = mounted ? viewHeight : MAP_SIZE;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", height: "100%" }}>
            <div
                style={{
                    fontSize: 14,
                    color: "#6b7280",
                    textAlign: "center",
                }}
            >
                {beji.length > 0 ? `${beji.length} beji on map` : "No beji yet"}
            </div>
            <svg
                width="100%"
                height="100%"
                viewBox={`${renderViewX} ${renderViewY} ${renderViewWidth} ${renderViewHeight}`}
                style={{
                    border: "2px solid #e5e7eb",
                    cursor: "default",
                    background: "#ffffff",
                }}
            >
                <MapGrid mapSize={MAP_SIZE} cellSize={CELL_SIZE} />
                {beji.map((b) => (
                    <BejiSprite key={b.id} beji={b} playerId={currentPlayerId} />
                ))}
            </svg>
            {isTouchPreferred && (
                <VirtualJoystick
                    onVector={(vx, vy) => {
                        // Scale vector to world units per tick
                        const speed = 8; // pixels per emit
                        stepBy(vx * speed, vy * speed);
                    }}
                />
            )}
            {beji.length > 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                    {beji.map((b) => (
                        <span key={b.id} style={{ marginRight: 8 }}>
                            {b.name}: {b.emoji}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

