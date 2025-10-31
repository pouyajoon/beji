"use client";

import { useAtom, useAtomValue, useSetAtom } from "../lib/jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Beji } from "./atoms";
import { bejiAtom, playersAtom, zoomPxPerMeterAtom } from "./atoms";
import { useKeyboardMovement } from "../hooks/useKeyboardMovement";
import { useShortcuts } from "../src/lib/shortcuts";
import { VirtualJoystick } from "./VirtualJoystick";
import { ActionsBar } from "./map/ActionsBar";
import { useTouchHandlers } from "./map/useTouchHandlers";
import { useMouseHandlers } from "./map/useMouseHandlers";
import {
    setupCanvas,
    drawBackground,
    drawGrid,
    drawOriginMarker,
    drawBeji,
    drawGuidanceLine,
    drawDebugOverlay,
} from "./map/drawing";
import { MAP_SIZE, BEJI_SPEED_MPS } from "../lib/constants";

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
            const nextTargetX = clamp(b.target.x + dx, 0, MAP_SIZE);
            const nextTargetY = clamp(b.target.y + dy, 0, MAP_SIZE);
            return { ...b, target: { x: nextTargetX, y: nextTargetY } };
        });
        setBeji(updated);
    };

    // Keyboard moves in meters per key repeat
    useKeyboardMovement((dx, dy) => stepBy(dx, dy), { enabled: true, stepSize: 1 });

    const [isTouchPreferred, setIsTouchPreferred] = useState(false);
    const [pixelsPerMeter, setPixelsPerMeter] = useAtom(zoomPxPerMeterAtom);
    const [followMouse, setFollowMouse] = useState(true);
    const followMouseRef = useRef<boolean>(true);
    const lastPointerClientRef = useRef<{ x: number; y: number } | null>(null);
    const prevFollowMouseRef = useRef<boolean>(true);
    useEffect(() => {
        followMouseRef.current = followMouse;
    }, [followMouse]);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mediaQuery = window.matchMedia("(pointer: coarse)");
        setIsTouchPreferred(mediaQuery.matches);
        const handleChange = (e: MediaQueryListEvent) => setIsTouchPreferred(e.matches);
        mediaQuery.addEventListener?.("change", handleChange);
        return () => mediaQuery.removeEventListener?.("change", handleChange);
    }, []);

    // Global shortcuts
    useShortcuts();

    const cameraTarget = useMemo(() => {
        const focus = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : beji[0];
        return focus ? { x: focus.position.x, y: focus.position.y } : { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
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

    // Persist current player's latest intended position (target) to localStorage
    useEffect(() => {
        if (typeof window === "undefined") return;
        const b = currentPlayerId ? beji.find((v) => v.playerId === currentPlayerId) : undefined;
        if (!b) return;
        try {
            window.localStorage.setItem(
                "beji:lastPosition",
                JSON.stringify({ x: Math.round(b.target.x), y: Math.round(b.target.y) })
            );
        } catch { }
    }, [beji, currentPlayerId]);


    // no toolbar debug timer; debug rendered on canvas

    // Physics positions (authoritative for render) live outside React to avoid re-renders
    const physicsPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    useEffect(() => {
        for (const b of beji) {
            if (!physicsPositionsRef.current.has(b.id)) {
                physicsPositionsRef.current.set(b.id, { x: b.position.x, y: b.position.y });
            }
        }
        // Remove positions for entities that no longer exist
        const ids = new Set(beji.map((b) => b.id));
        for (const id of Array.from(physicsPositionsRef.current.keys())) {
            if (!ids.has(id)) physicsPositionsRef.current.delete(id);
        }
    }, [beji]);

    // When follow is turned off, stop the beji by setting target to current position
    useEffect(() => {
        // Only run when follow changes from true to false
        if (prevFollowMouseRef.current && !followMouse && currentPlayerId) {
            const playerBeji = bejiRef.current.find((b) => b.playerId === currentPlayerId);
            if (playerBeji) {
                const pos = physicsPositionsRef.current.get(playerBeji.id) ?? { x: playerBeji.position.x, y: playerBeji.position.y };
                const updated: Beji[] = bejiRef.current.map((b: Beji) => (
                    b.playerId === currentPlayerId
                        ? { ...b, target: { x: pos.x, y: pos.y } }
                        : b
                ));
                setBeji(updated);
            }
        }
        prevFollowMouseRef.current = followMouse;
    }, [followMouse, currentPlayerId, setBeji]);

    // Mouse follow + hover pause (hit test against player's beji)
    const bejiHoverRadiusMeters = 0.6; // ~1m sized beji; use 0.6m hover radius

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
                    // Skip movement if walk is false
                    if (!b.walk) continue;
                    const pos = physicsPositionsRef.current.get(b.id) ?? { x: b.position.x, y: b.position.y };
                    const dx = b.target.x - pos.x;
                    const dy = b.target.y - pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 1e-3) {
                        physicsPositionsRef.current.set(b.id, { x: b.target.x, y: b.target.y });
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

    // Initialize touch and mouse handlers
    const touchHandlers = useTouchHandlers({
        isTouchPreferred,
        pixelsPerMeter,
        cameraTarget,
        cameraOffset,
        setCameraOffset,
        setPixelsPerMeter,
        viewport,
        renderViewX,
        renderViewY,
        renderViewWidth,
        renderViewHeight,
        canvasRef,
    });

    const mouseHandlers = useMouseHandlers({
        isTouchPreferred,
        followMouse,
        currentPlayerId,
        beji,
        setBeji,
        cameraTarget,
        cameraOffset,
        setCameraOffset,
        pixelsPerMeter,
        setPixelsPerMeter,
        viewport,
        renderViewX,
        renderViewY,
        renderViewWidth,
        renderViewHeight,
        canvasRef,
        physicsPositionsRef,
        bejiHoverRadiusMeters,
    });

    // Keep ETA endpoint in sync when toggling follow via shortcut without moving the mouse
    useEffect(() => {
        // When turning follow ON, recompute mouse world position using last known client pointer
        if (followMouse && mouseHandlers.lastPointerClientRef.current) {
            const p = mouseHandlers.lastPointerClientRef.current;
            const { x, y } = mouseHandlers.clientToWorld(p.x, p.y);
            mouseHandlers.mouseWorldRef.current = { x, y };
            // Immediately update target so movement starts without requiring mouse movement
            mouseHandlers.setTargetTo(x, y);
        }
        // When turning follow OFF, hide ETA immediately by clearing endpoint
        if (!followMouse) {
            mouseHandlers.mouseWorldRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [followMouse]);

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

            // Setup canvas and transformation
            setupCanvas({
                canvas: canvasEl,
                ctx: ctx2,
                viewport,
                renderViewX,
                renderViewY,
                renderViewWidth,
                renderViewHeight,
            });

            // Draw background
            drawBackground({
                ctx: ctx2,
                renderViewX,
                renderViewY,
                renderViewWidth,
                renderViewHeight,
            });

            // Draw grid
            drawGrid({
                ctx: ctx2,
                canvas: canvasEl,
                renderViewX,
                renderViewY,
                renderViewWidth,
                renderViewHeight,
            });

            // Draw origin marker
            drawOriginMarker({
                ctx: ctx2,
                canvas: canvasEl,
                renderViewX,
                renderViewY,
                renderViewWidth,
                renderViewHeight,
            });

            // Draw beji entities
            drawBeji({
                ctx: ctx2,
                canvas: canvasEl,
                beji: bejiRef.current,
                physicsPositions: physicsPositionsRef.current,
                renderViewX,
                renderViewY,
                renderViewWidth,
                renderViewHeight,
                pixelsPerMeter,
            });

            // Draw guidance line and ETA (if applicable)
            if (!isTouchPreferred && currentPlayerId && mouseHandlers.mouseWorldRef.current && followMouseRef.current) {
                const playerBeji = bejiRef.current.find((bb) => bb.playerId === currentPlayerId);
                if (playerBeji && playerBeji.walk) {
                    const p = physicsPositionsRef.current.get(playerBeji.id) ?? { x: playerBeji.position.x, y: playerBeji.position.y };
                    drawGuidanceLine({
                        ctx: ctx2,
                        canvas: canvasEl,
                        playerBeji: p,
                        mouseWorld: mouseHandlers.mouseWorldRef.current,
                        renderViewX,
                        renderViewY,
                        renderViewWidth,
                        renderViewHeight,
                    });
                }
            }

            // Draw debug overlay
            drawDebugOverlay({
                ctx: ctx2,
                canvas: canvasEl,
                mouseWorld: mouseHandlers.mouseWorldRef.current,
                beji: bejiRef.current,
                physicsPositions: physicsPositionsRef.current,
                pixelsPerMeter,
                renderViewX,
                renderViewY,
                renderViewWidth,
                renderViewHeight,
                followMouse: followMouseRef.current,
            });

            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [viewport.width, viewport.height, renderViewX, renderViewY, renderViewWidth, renderViewHeight, currentPlayerId]);


    return (
        <div ref={containerRef} onWheel={mouseHandlers.handleWheel} style={{ display: "flex", flexDirection: "column", gap: 0, width: "100vw", height: "100dvh", overflow: "hidden", position: "relative", border: "2px solid #e5e7eb" }}>
            <ActionsBar
                followMouse={followMouse}
                onToggleFollowMouse={setFollowMouse}
                currentPlayerId={currentPlayerId}
                setCameraOffset={setCameraOffset}
                getPhysicsPosition={(bejiId) => physicsPositionsRef.current.get(bejiId)}
            />
            <canvas
                ref={canvasRef}
                style={{
                    cursor: mouseHandlers.isDragging ? "grabbing" : "default",
                    background: "#ffffff",
                    boxSizing: "border-box",
                    width: "100%",
                    height: `${viewport.height}px`,
                    display: "block",
                    touchAction: "none", // Prevent default touch behaviors (scrolling, zooming)
                }}
                onMouseMove={mouseHandlers.handleMouseMove}
                onMouseDown={mouseHandlers.handleMouseDown}
                onMouseUp={mouseHandlers.endDrag}
                onMouseLeave={mouseHandlers.endDrag}
                onTouchStart={touchHandlers.handleTouchStart}
                onTouchMove={touchHandlers.handleTouchMove}
                onTouchEnd={touchHandlers.handleTouchEnd}
            />
            {/* (debug now rendered on canvas) */}
            {
                isTouchPreferred && (
                    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 1000 }}>
                        <VirtualJoystick
                            onVector={(vx, vy) => {
                                const speed = 8;
                                stepBy(vx * speed, vy * speed);
                            }}
                        />
                    </div>
                )
            }
            {/* Zoom HUD moved to toolbar */}
        </div >
    );
}


