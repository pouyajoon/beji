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

    // Camera offset allows zooming to mouse position without breaking player-following target
    const [cameraOffset, setCameraOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const cameraCenterX = cameraTarget.x + cameraOffset.x;
    const cameraCenterY = cameraTarget.y + cameraOffset.y;

    // Zoom-driven view size in world meters
    const viewWidth = Math.min(MAP_SIZE, viewport.width / Math.max(1, pixelsPerMeter));
    const viewHeight = Math.min(MAP_SIZE, viewport.height / Math.max(1, pixelsPerMeter));

    const viewX = Math.max(0, Math.min(MAP_SIZE - viewWidth, cameraCenterX - viewWidth / 2));
    const viewY = Math.max(0, Math.min(MAP_SIZE - viewHeight, cameraCenterY - viewHeight / 2));

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

    // Debug overlay ticker to refresh HTML stats periodically without heavy re-renders
    const [debugTick, setDebugTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setDebugTick((t) => (t + 1) % 1_000_000), 100);
        return () => clearInterval(id);
    }, []);

    // Physics positions (authoritative for render) live outside React to avoid re-renders
    const physicsPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    useEffect(() => {
        for (const b of beji) {
            if (!physicsPositionsRef.current.has(b.id)) {
                physicsPositionsRef.current.set(b.id, { x: b.x, y: b.y });
            }
        }
        // Remove positions for entities that no longer exist
        const ids = new Set(beji.map((b) => b.id));
        for (const id of Array.from(physicsPositionsRef.current.keys())) {
            if (!ids.has(id)) physicsPositionsRef.current.delete(id);
        }
    }, [beji]);

    // Mouse follow + hover pause (hit test against player's beji)
    const bejiHoverRadiusMeters = 0.6; // ~1m sized beji; use 0.6m hover radius
    const isPlayerBejiHoveredRef = useRef(false);
    const mouseWorldRef = useRef<{ x: number; y: number } | null>(null);

    // Fixed-timestep physics loop (decoupled from rendering)
    useEffect(() => {
        let raf = 0;
        const fixedDt = 1 / 60; // seconds
        const maxFrame = 0.25; // avoid spiral of death
        let last = performance.now();
        let acc = 0;

        const step = () => {
            const now = performance.now();
            let frameTime = (now - last) / 1000;
            last = now;
            if (frameTime > maxFrame) frameTime = maxFrame;
            acc += frameTime;

            while (acc >= fixedDt) {
                // Integrate towards targets
                for (const b of bejiRef.current) {
                    const pos = physicsPositionsRef.current.get(b.id) ?? { x: b.x, y: b.y };
                    const dx = b.targetX - pos.x;
                    const dy = b.targetY - pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 1e-3) {
                        physicsPositionsRef.current.set(b.id, { x: b.targetX, y: b.targetY });
                    } else {
                        const stepMeters = Math.min(BEJI_SPEED_MPS * fixedDt, dist);
                        physicsPositionsRef.current.set(b.id, { x: pos.x + (dx / dist) * stepMeters, y: pos.y + (dy / dist) * stepMeters });
                    }
                }
                acc -= fixedDt;
            }

            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, []);

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
        mouseWorldRef.current = { x, y };
        // hover detection against smoothed position if available, else current beji pos
        const playerBeji = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : undefined;
        if (playerBeji) {
            const pos = physicsPositionsRef.current.get(playerBeji.id) ?? { x: playerBeji.x, y: playerBeji.y };
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

    // Render loop (draw only; no simulation)
    useEffect(() => {
        let raf = 0;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const canvasEl = canvas;
        const ctx2 = ctx;

        let lastTs = performance.now();
        function draw(ts: number) {
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
            const gxStart = Math.max(0, Math.floor(renderViewX));
            const gxEnd = Math.min(MAP_SIZE, Math.ceil(renderViewX + renderViewWidth));
            for (let x = gxStart; x <= gxEnd; x += 1) {
                ctx2.beginPath();
                ctx2.strokeStyle = x % 10 === 0 ? "#d1d5db" : "#eef2f7";
                ctx2.moveTo(x, renderViewY);
                ctx2.lineTo(x, renderViewY + renderViewHeight);
                ctx2.stroke();
            }
            const gyStart = Math.max(0, Math.floor(renderViewY));
            const gyEnd = Math.min(MAP_SIZE, Math.ceil(renderViewY + renderViewHeight));
            for (let y = gyStart; y <= gyEnd; y += 1) {
                ctx2.beginPath();
                ctx2.strokeStyle = y % 10 === 0 ? "#d1d5db" : "#eef2f7";
                ctx2.moveTo(renderViewX, y);
                ctx2.lineTo(renderViewX + renderViewWidth, y);
                ctx2.stroke();
            }

            // draw world origin marker (0,0) with ⭕ in screen space for consistent size
            {
                const originScreenX = (0 - renderViewX) * (canvasEl.width / renderViewWidth);
                const originScreenY = (0 - renderViewY) * (canvasEl.height / renderViewHeight);
                ctx2.save();
                ctx2.setTransform(1, 0, 0, 1, 0, 0);
                ctx2.font = `16px system-ui, Apple Color Emoji, Segoe UI Emoji`;
                ctx2.textAlign = "center";
                ctx2.textBaseline = "middle";
                ctx2.fillText("⭕", originScreenX, originScreenY);
                ctx2.restore();
            }

            // draw beji from physics positions
            for (const b of bejiRef.current) {
                const p = physicsPositionsRef.current.get(b.id) ?? { x: b.x, y: b.y };
                // removed background shadow for clear emoji visibility

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

            // draw guidance line and ETA from current player's beji to mouse
            if (!isTouchPreferred && currentPlayerId && mouseWorldRef.current) {
                const playerBeji = bejiRef.current.find((bb) => bb.playerId === currentPlayerId);
                if (playerBeji) {
                    const p = physicsPositionsRef.current.get(playerBeji.id) ?? { x: playerBeji.x, y: playerBeji.y };
                    const m = mouseWorldRef.current;
                    const dx = m.x - p.x;
                    const dy = m.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 1e-3) {
                        // world-space line
                        ctx2.save();
                        ctx2.globalAlpha = 0.7;
                        ctx2.strokeStyle = "#3b82f6";
                        ctx2.lineWidth = 2 / Math.max(1, (canvasEl.width / renderViewWidth));
                        ctx2.setLineDash([1.5, 1.5]);
                        ctx2.beginPath();
                        ctx2.moveTo(p.x, p.y);
                        ctx2.lineTo(m.x, m.y);
                        ctx2.stroke();
                        ctx2.restore();

                        // ETA label in screen space near the mouse position (independent of zoom)
                        const etaSec = dist / BEJI_SPEED_MPS;
                        const etaText = `${etaSec.toFixed(1)}s`;
                        const mouseScreenX = (m.x - renderViewX) * (canvasEl.width / renderViewWidth);
                        const mouseScreenY = (m.y - renderViewY) * (canvasEl.height / renderViewHeight);
                        const fontPx = 18; // larger constant px size regardless of zoom
                        const padding = 4;
                        const margin = 6;
                        // offset label slightly away from mouse cursor
                        const normX = dx / dist;
                        const normY = dy / dist;
                        // perpendicular offset to avoid overlapping the line; also push forward
                        const offX = normX * 8 - normY * 8;
                        const offY = normY * 8 + normX * 8;
                        let labelX = mouseScreenX + offX;
                        let labelY = mouseScreenY + offY;

                        ctx2.save();
                        ctx2.setTransform(1, 0, 0, 1, 0, 0);
                        ctx2.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto`;
                        ctx2.textAlign = "center";
                        ctx2.textBaseline = "bottom";
                        const metrics = ctx2.measureText(etaText);
                        const textW = metrics.width;
                        const textH = fontPx;

                        // clamp inside canvas bounds
                        const minX = margin + textW / 2 + padding;
                        const maxX = canvasEl.width - (margin + textW / 2 + padding);
                        const minY = margin + textH + padding;
                        const maxY = canvasEl.height - margin;
                        labelX = Math.max(minX, Math.min(maxX, labelX));
                        labelY = Math.max(minY, Math.min(maxY, labelY));

                        // backdrop for readability
                        ctx2.fillStyle = "rgba(255,255,255,0.9)";
                        ctx2.fillRect(labelX - textW / 2 - padding, labelY - textH - padding, textW + padding * 2, textH + padding);
                        ctx2.fillStyle = "#111827";
                        ctx2.fillText(etaText, labelX, labelY - 2);
                        ctx2.restore();
                    }
                }
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
        const nextPixelsPerMeter = Math.max(10, Math.min(400, pixelsPerMeter * factor));

        // Compute mouse position as fraction of canvas and corresponding world point
        const canvas = canvasRef.current;
        if (!canvas) {
            setPixelsPerMeter(nextPixelsPerMeter);
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) / Math.max(1, rect.width);
        const py = (e.clientY - rect.top) / Math.max(1, rect.height);

        // World point under cursor before zoom
        const worldBeforeX = renderViewX + px * renderViewWidth;
        const worldBeforeY = renderViewY + py * renderViewHeight;
        // Update ETA endpoint immediately so guidance line stays in sync with zoom
        mouseWorldRef.current = { x: worldBeforeX, y: worldBeforeY };

        // Desired view size after zoom
        const nextViewWidth = Math.min(MAP_SIZE, viewport.width / Math.max(1, nextPixelsPerMeter));
        const nextViewHeight = Math.min(MAP_SIZE, viewport.height / Math.max(1, nextPixelsPerMeter));

        // Desired camera center so that the same world point stays under the cursor
        let desiredCenterX = worldBeforeX + (0.5 - px) * nextViewWidth;
        let desiredCenterY = worldBeforeY + (0.5 - py) * nextViewHeight;

        // Clamp to map bounds by clamping the future view rect
        let nextViewX = desiredCenterX - nextViewWidth / 2;
        let nextViewY = desiredCenterY - nextViewHeight / 2;
        nextViewX = Math.max(0, Math.min(MAP_SIZE - nextViewWidth, nextViewX));
        nextViewY = Math.max(0, Math.min(MAP_SIZE - nextViewHeight, nextViewY));
        desiredCenterX = nextViewX + nextViewWidth / 2;
        desiredCenterY = nextViewY + nextViewHeight / 2;

        // Update zoom and camera offset relative to player-follow target
        setPixelsPerMeter(nextPixelsPerMeter);
        setCameraOffset({
            x: desiredCenterX - cameraTarget.x,
            y: desiredCenterY - cameraTarget.y,
        });
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
            {/* Debug overlay (HTML) */}
            <div
                style={{
                    position: "absolute",
                    left: 12,
                    top: 12,
                    background: "rgba(255,255,255,0.85)",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
                    color: "#111827",
                    maxWidth: 280,
                    pointerEvents: "none",
                    whiteSpace: "pre-wrap",
                }}
            >
                {(() => {
                    const mouse = mouseWorldRef.current;
                    const bejiLines = bejiRef.current.map((b) => {
                        const p = physicsPositionsRef.current.get(b.id) ?? { x: b.x, y: b.y };
                        return `${b.emoji}  x:${p.x.toFixed(2)}  y:${p.y.toFixed(2)}  (player:${b.playerId ?? "-"})`;
                    });
                    return [
                        `zoom: ${Math.round(pixelsPerMeter)} px/m`,
                        `view: x:${renderViewX.toFixed(2)} y:${renderViewY.toFixed(2)} w:${renderViewWidth.toFixed(2)} h:${renderViewHeight.toFixed(2)}`,
                        mouse ? `mouse: x:${mouse.x.toFixed(2)} y:${mouse.y.toFixed(2)}` : `mouse: -`,
                        `beji:`,
                        ...bejiLines,
                        `t:${debugTick}`,
                    ].join("\n");
                })()}
            </div>
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


