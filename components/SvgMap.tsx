"use client";

import { useAtomValue, useSetAtom } from "../lib/jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapGrid } from "./MapGrid";
import type { Beji } from "./atoms";
import { bejiAtom, playersAtom } from "./atoms";
import { useKeyboardMovement } from "../hooks/useKeyboardMovement";
import { VirtualJoystick } from "./VirtualJoystick";

const MAP_SIZE = 800;
const CELL_SIZE = 40;

function BejiSprite({
    beji,
    playerId,
    onHoverEnter,
    onHoverLeave,
}: {
    beji: Beji;
    playerId: string;
    onHoverEnter?: (e: any) => void;
    onHoverLeave?: () => void;
}) {
    const [position, setPosition] = useState({ x: beji.x, y: beji.y });
    const [target, setTarget] = useState({ x: beji.targetX, y: beji.targetY });

    useEffect(() => {
        setTarget({ x: beji.targetX, y: beji.targetY });
    }, [beji.targetX, beji.targetY]);

    useEffect(() => {
        // Skip movement if walk is false
        if (!beji.walk) return;
        
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
    }, [position.x, position.y, target.x, target.y, beji.walk]);

    const isMoving =
        Math.abs(position.x - target.x) > 1 || Math.abs(position.y - target.y) > 1;

    return (
        <g onMouseEnter={onHoverEnter} onMouseLeave={onHoverLeave}>
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

export function SvgMap() {
    const beji = useAtomValue(bejiAtom);
    const players = useAtomValue(playersAtom);
    const setBeji = useSetAtom(bejiAtom);
    const currentPlayerId = players[0]?.id ?? "";

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
            handleResize();
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

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

    const [isTouchPreferred, setIsTouchPreferred] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mediaQuery = window.matchMedia("(pointer: coarse)");
        setIsTouchPreferred(mediaQuery.matches);
        const handleChange = (e: MediaQueryListEvent) => setIsTouchPreferred(e.matches);
        mediaQuery.addEventListener?.("change", handleChange);
        return () => mediaQuery.removeEventListener?.("change", handleChange);
    }, []);

    const cameraTarget = useMemo(() => {
        const focus = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : beji[0];
        return focus ? { x: focus.x, y: focus.y } : { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
    }, [beji, currentPlayerId]);

    const aspect = viewport.width / Math.max(1, viewport.height);
    const baseViewSize = 400;
    const viewWidth = Math.min(MAP_SIZE, aspect >= 1 ? baseViewSize * aspect : baseViewSize);
    const viewHeight = Math.min(MAP_SIZE, aspect >= 1 ? baseViewSize : baseViewSize / aspect);

    const viewX = Math.max(0, Math.min(MAP_SIZE - viewWidth, cameraTarget.x - viewWidth / 2));
    const viewY = Math.max(0, Math.min(MAP_SIZE - viewHeight, cameraTarget.y - viewHeight / 2));

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const renderViewX = mounted ? viewX : 0;
    const renderViewY = mounted ? viewY : 0;
    const renderViewWidth = mounted ? viewWidth : MAP_SIZE;
    const renderViewHeight = mounted ? viewHeight : MAP_SIZE;

    const [isBejiHovered, setIsBejiHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement | null>(null);

    function clientToWorld(clientX: number, clientY: number) {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        const px = (clientX - rect.left) / Math.max(1, rect.width);
        const py = (clientY - rect.top) / Math.max(1, rect.height);
        const x = renderViewX + px * renderViewWidth;
        const y = renderViewY + py * renderViewHeight;
        return { x: clamp(x, 0, MAP_SIZE), y: clamp(y, 0, MAP_SIZE) };
    }

    const setTargetTo = (worldX: number, worldY: number) => {
        if (!currentPlayerId) return;
        const updated: Beji[] = beji.map((b: Beji) => (
            b.playerId === currentPlayerId
                ? { ...b, targetX: clamp(worldX, 0, MAP_SIZE), targetY: clamp(worldY, 0, MAP_SIZE) }
                : b
        ));
        setBeji(updated);
    };

    const handleSvgMouseMove = (e: any) => {
        if (isTouchPreferred) return;
        if (isBejiHovered) return;
        const { x, y } = clientToWorld(e.clientX, e.clientY);
        setTargetTo(x, y);
    };

    const handleBejiMouseEnter = (e: any) => {
        setIsBejiHovered(true);
        const { x, y } = clientToWorld(e.clientX, e.clientY);
        setTargetTo(x, y);
    };

    const handleBejiMouseLeave = () => {
        setIsBejiHovered(false);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100vw", height: "100vh", position: "relative" }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`${renderViewX} ${renderViewY} ${renderViewWidth} ${renderViewHeight}`}
                style={{
                    border: "2px solid #e5e7eb",
                    cursor: "default",
                    background: "#ffffff",
                    flex: 1,
                }}
                onMouseMove={handleSvgMouseMove}
            >
                <MapGrid mapSize={MAP_SIZE} cellSize={CELL_SIZE} />
                {beji.map((b) => (
                    <BejiSprite
                        key={b.id}
                        beji={b}
                        playerId={currentPlayerId}
                        onHoverEnter={b.playerId === currentPlayerId ? handleBejiMouseEnter : undefined}
                        onHoverLeave={b.playerId === currentPlayerId ? handleBejiMouseLeave : undefined}
                    />
                ))}
            </svg>
            {isTouchPreferred && (
                <div style={{ position: "absolute", right: 16, bottom: 16 }}>
                    <VirtualJoystick
                        onVector={(vx, vy) => {
                            const speed = 8;
                            stepBy(vx * speed, vy * speed);
                        }}
                    />
                </div>
            )}
        </div>
    );
}


