"use client";

import { useAtom, useAtomValue, useSetAtom } from "../lib/jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Beji } from "./atoms";
import { bejiAtom, playersAtom, zoomPxPerMeterAtom } from "./atoms";
import { useKeyboardMovement } from "../hooks/useKeyboardMovement";
import { VirtualJoystick } from "./VirtualJoystick";

const MAP_SIZE = 800; // meters
const DEFAULT_PX_PER_M = 100; // zoom 1 => 100 pixels per meter
const BEJI_SPEED_MPS = 5; // meters per second

export function CanvasMap() {
    const beji = useAtomValue(bejiAtom);
    const players = useAtomValue(playersAtom);
    const setBeji = useSetAtom(bejiAtom);
    const currentPlayerId = players[0]?.id ?? "";

    const [viewport, setViewport] = useState<{ width: number; height: number }>(() => ({
        width: 800,
        height: 800,
    }));
    const containerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        // Initial measure
        const rect = el.getBoundingClientRect();
        const measuredWidth = Math.max(1, Math.floor(rect.width));
        // Full-width canvas map: make height equal to width (square)
        setViewport({ width: measuredWidth, height: measuredWidth });
        // Observe container size changes
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const cr = entry.contentRect;
                const w = Math.max(1, Math.floor(cr.width));
                setViewport({ width: w, height: w });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
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

    // Keyboard moves in meters per key repeat
    useKeyboardMovement((dx, dy) => stepBy(dx, dy), { enabled: true, stepSize: 1 });

    const [isTouchPreferred, setIsTouchPreferred] = useState(false);
    const [pixelsPerMeter, setPixelsPerMeter] = useAtom(zoomPxPerMeterAtom);
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

    // Zoom-driven view size in world meters
    const viewWidth = Math.min(MAP_SIZE, viewport.width / Math.max(1, pixelsPerMeter));
    const viewHeight = Math.min(MAP_SIZE, viewport.height / Math.max(1, pixelsPerMeter));

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

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const bejiRef = useRef<Beji[]>(beji);
    useEffect(() => {
        bejiRef.current = beji;
    }, [beji]);

    // Smoothed positions for rendering animation
    const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    useEffect(() => {
        for (const b of beji) {
            if (!positionsRef.current.has(b.id)) {
                positionsRef.current.set(b.id, { x: b.x, y: b.y });
            }
        }
    }, [beji]);

    // Mouse follow + hover pause (hit test against player's beji)
    const bejiHoverRadiusMeters = 0.6; // ~1m sized beji; use 0.6m hover radius
    const isPlayerBejiHoveredRef = useRef(false);

    function clientToWorld(clientX: number, clientY: number) {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
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

    const handleMouseMove = (e: any) => {
        if (isTouchPreferred) return;
        const { x, y } = clientToWorld(e.clientX, e.clientY);
        // hover detection against smoothed position if available, else current beji pos
        const playerBeji = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : undefined;
        if (playerBeji) {
            const pos = positionsRef.current.get(playerBeji.id) ?? { x: playerBeji.x, y: playerBeji.y };
            const dx = x - pos.x;
            const dy = y - pos.y;
            const isHover = Math.sqrt(dx * dx + dy * dy) <= bejiHoverRadiusMeters;
            isPlayerBejiHoveredRef.current = isHover;
        } else {
            isPlayerBejiHoveredRef.current = false;
        }
        if (isPlayerBejiHoveredRef.current) return;
        setTargetTo(x, y);
    };

    // Draw loop
    useEffect(() => {
        let raf = 0;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const canvasEl = canvas;
        const ctx2 = ctx;

        let lastTs = performance.now();
        function draw(ts: number) {
            const deltaSeconds = Math.max(0, Math.min(0.1, (ts - lastTs) / 1000)); // clamp to avoid huge jumps
            lastTs = ts;
            // Resize canvas to device pixels for sharp rendering
            const dpr = window.devicePixelRatio || 1;
            const width = Math.max(1, viewport.width);
            const height = Math.max(1, viewport.height);
            if (canvasEl.width !== Math.floor(width * dpr) || canvasEl.height !== Math.floor(height * dpr)) {
                canvasEl.width = Math.floor(width * dpr);
                canvasEl.height = Math.floor(height * dpr);
            }
            canvasEl.style.width = `${width}px`;
            canvasEl.style.height = `${height}px`;

            ctx2.setTransform(1, 0, 0, 1, 0, 0);
            ctx2.clearRect(0, 0, canvasEl.width, canvasEl.height);
            // world-to-screen scale (pixels per meter)
            const zoom = canvasEl.width / renderViewWidth; // equals pixelsPerMeter when widths match
            ctx2.scale(zoom, canvasEl.height / renderViewHeight);
            ctx2.translate(-renderViewX, -renderViewY);

            // background
            ctx2.fillStyle = "#ffffff";
            ctx2.fillRect(renderViewX, renderViewY, renderViewWidth, renderViewHeight);

            // grid lines every 1 meter; darker every 10 meters
            ctx2.lineWidth = 1 / Math.max(1, (canvasEl.width / renderViewWidth));
            for (let x = 0; x <= MAP_SIZE; x += 1) {
                ctx2.beginPath();
                ctx2.strokeStyle = x % 10 === 0 ? "#d1d5db" : "#eef2f7";
                ctx2.moveTo(x, 0);
                ctx2.lineTo(x, MAP_SIZE);
                ctx2.stroke();
            }
            for (let y = 0; y <= MAP_SIZE; y += 1) {
                ctx2.beginPath();
                ctx2.strokeStyle = y % 10 === 0 ? "#d1d5db" : "#eef2f7";
                ctx2.moveTo(0, y);
                ctx2.lineTo(MAP_SIZE, y);
                ctx2.stroke();
            }

            // update and draw beji (time-based movement in meters/sec)
            for (const b of bejiRef.current) {
                const pos = positionsRef.current.get(b.id) ?? { x: b.x, y: b.y };
                const dx = b.targetX - pos.x;
                const dy = b.targetY - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1) {
                    positionsRef.current.set(b.id, { x: b.targetX, y: b.targetY });
                } else {
                    const step = Math.min(BEJI_SPEED_MPS * deltaSeconds, dist);
                    positionsRef.current.set(b.id, { x: pos.x + (dx / dist) * step, y: pos.y + (dy / dist) * step });
                }
                const p = positionsRef.current.get(b.id)!;

                // shadow circle
                ctx2.globalAlpha = 0.2;
                ctx2.fillStyle = b.playerId === currentPlayerId ? "#3b82f6" : "#ef4444";
                ctx2.beginPath();
                ctx2.arc(b.x, b.y, 0.2, 0, Math.PI * 2); // 0.2m radius shadow
                ctx2.fill();
                ctx2.globalAlpha = 1;

                // draw emoji in screen space so size tracks pixels per meter cleanly
                const screenX = (p.x - renderViewX) * (canvasEl.width / renderViewWidth);
                const screenY = (p.y - renderViewY) * (canvasEl.height / renderViewHeight);
                ctx2.save();
                ctx2.setTransform(1, 0, 0, 1, 0, 0);
                ctx2.font = `${0.7 * pixelsPerMeter}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
                ctx2.textAlign = "center";
                ctx2.textBaseline = "middle";
                ctx2.fillText(b.emoji, screenX, screenY);
                ctx2.restore();
            }

            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [viewport.width, viewport.height, renderViewX, renderViewY, renderViewWidth, renderViewHeight, currentPlayerId]);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (isTouchPreferred) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        const next = Math.max(10, Math.min(400, pixelsPerMeter * factor));
        setPixelsPerMeter(next);
    };

    return (
        <div ref={containerRef} onWheel={handleWheel} style={{ display: "flex", flexDirection: "column", gap: 0, width: "100vw", position: "relative", border: "2px solid #e5e7eb" }}>
            <canvas
                ref={canvasRef}
                style={{
                    cursor: "default",
                    background: "#ffffff",
                    boxSizing: "border-box",
                    width: "100%",
                    height: `${viewport.height}px`,
                    display: "block",
                }}
                onMouseMove={handleMouseMove}
            />
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
            {/* Simple zoom HUD */}
            <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,0.8)", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                zoom: {Math.round(pixelsPerMeter)} px/m
            </div>
        </div>
    );
}


