"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import type { Beji } from "./atoms";
import {
    bejiAtom,
    playersAtom,
    zoomPxPerMeterAtom,
    staticBejiAtom,
    inventoryAtom,
    staticBejiForWorldAtom,
    followMouseAtom,
} from "./atoms";
import { ActionsBar } from "./map/ActionsBar";
import { useBejiSync } from "../hooks/useBejiSync";
import { useKeyboardMovement } from "../hooks/useKeyboardMovement";
import { MAP_SIZE, BEJI_SPEED_MPS } from "../lib/constants";
import { useAtom, useAtomValue, useSetAtom } from "../lib/jotai";
import { drawBackground } from "./map/drawing/background";
import { drawBeji } from "./map/drawing/beji";
import { setupCanvas } from "./map/drawing/canvasSetup";
import { drawDebugOverlay } from "./map/drawing/debugOverlay";
import { useMouseHandlers } from "./map/useMouseHandlers";
import { useTouchHandlers } from "./map/useTouchHandlers";
import { VirtualJoystick } from "./VirtualJoystick";
import { useShortcuts } from "../src/lib/shortcuts";
import { drawGrid } from "./map/drawing/grid";
import { drawGuidanceLine } from "./map/drawing/guidanceLine";
import { drawOriginMarker } from "./map/drawing/originMarker";
import { drawStaticBeji } from "./map/drawing/staticBeji";

export function CanvasMap() {
    const beji = useAtomValue(bejiAtom);
    const players = useAtomValue(playersAtom);
    const setBeji = useSetAtom(bejiAtom);
    const setStaticBeji = useSetAtom(staticBejiAtom);
    const setInventory = useSetAtom(inventoryAtom);
    const currentPlayerId = players[0]?.id ?? "";
    
    // Get current player's beji and its world's static beji
    const currentBeji = beji.find((b) => b.playerId === currentPlayerId);
    const worldIdAtom = useMemo(
        () => (currentBeji?.worldId ? staticBejiForWorldAtom(currentBeji.worldId) : staticBejiAtom),
        [currentBeji?.worldId]
    );
    const staticBejiForWorld = useAtomValue(worldIdAtom);
    const staticBeji = currentBeji?.worldId ? staticBejiForWorld : [];

    // Setup beji position sync
    const { sendUpdate } = useBejiSync({
        bejiId: currentBeji?.id ?? null,
    });

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

    const stepBy = useCallback((dx: number, dy: number) => {
        if (!currentPlayerId) return;
        const updated: Beji[] = beji.map((b: Beji) => {
            if (b.playerId !== currentPlayerId) return b;
            const targetX = b.target?.x ?? b.position.x;
            const targetY = b.target?.y ?? b.position.y;
            const nextTargetX = clamp(targetX + dx, -MAP_SIZE / 2, MAP_SIZE / 2);
            const nextTargetY = clamp(targetY + dy, -MAP_SIZE / 2, MAP_SIZE / 2);
            return { ...b, target: { x: nextTargetX, y: nextTargetY } };
        });
        setBeji(updated);
    }, [beji, currentPlayerId, setBeji]);

    // Keyboard moves in meters per key repeat
    useKeyboardMovement(stepBy, { enabled: true, stepSize: 1 });

    const [isTouchPreferred, setIsTouchPreferred] = useState(false);
    const [pixelsPerMeter, setPixelsPerMeter] = useAtom(zoomPxPerMeterAtom);
    const [followMouse, setFollowMouse] = useAtom(followMouseAtom);
    const followMouseRef = useRef<boolean>(true);
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

    // Physics positions (authoritative for render) live outside React to avoid re-renders
    // Must be declared before cameraTarget useMemo that may reference it
    const physicsPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // Camera target should track physics position, not atom position
    // Initialize camera target only once - actual updates happen in render loop
    const cameraTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const currentBejiIdRef = useRef<string | null>(null);
    const lastInitializedBejiIdRef = useRef<string | null>(null);
    const lastWorldIdRef = useRef<string | null>(null);
    const hasInitializedForWorldRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        // Initialize camera target only when currentPlayerId changes or when beji is first created
        const focus = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : beji[0];
        const currentFocusId = focus?.id ?? null;
        const currentWorldId = focus?.worldId ?? null;
        // Reset zoom initialization when world changes
        if (currentWorldId && currentWorldId !== lastWorldIdRef.current) {
            lastInitializedBejiIdRef.current = null;
            lastWorldIdRef.current = currentWorldId;
            // Clear initialization flag for old world if needed
            hasInitializedForWorldRef.current.clear();
        }
        // Only update if the beji ID changed (new beji) or currentPlayerId changed
        if (focus && currentFocusId !== currentBejiIdRef.current) {
            currentBejiIdRef.current = currentFocusId;
            const physicsPos = physicsPositionsRef.current.get(focus.id);
            if (physicsPos) {
                cameraTargetRef.current = { x: physicsPos.x, y: physicsPos.y };
            } else {
                cameraTargetRef.current = { x: focus.position.x, y: focus.position.y };
            }
        }
    }, [beji, currentPlayerId]); // Depend on beji array but only update when beji ID changes
    
    // Return a stable reference that doesn't trigger re-renders on target changes
    const cameraTarget = cameraTargetRef.current;

    // Camera offset allows zooming to mouse position without breaking player-following target
    const [cameraOffset, setCameraOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    
    // Initialize zoom to show 20m around the beji when loading a world
    useEffect(() => {
        // Use currentBeji which is already computed
        if (!currentBeji || !currentBeji.worldId) return;
        
        // Wait for viewport to be measured (not just default 800x800)
        // Check if viewport has been measured by ResizeObserver (should be > 800 or match container)
        if (viewport.width <= 800 && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            if (rect.width <= 0) return; // Container not ready yet
        }
        
        // Check if we need to initialize zoom for this beji/world
        // Initialize if beji changed OR if we haven't initialized for this world yet
        const needsInitialization = 
            currentBeji.id !== lastInitializedBejiIdRef.current || 
            !hasInitializedForWorldRef.current.has(currentBeji.worldId);
        
        if (needsInitialization) {
            // Use double requestAnimationFrame to ensure viewport is fully measured and DOM is ready
            const rafId = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Double-check that beji still exists and hasn't changed
                    const stillCurrent = beji.find((b) => b.id === currentBeji.id);
                    if (stillCurrent && stillCurrent.worldId && stillCurrent.id === currentBeji.id) {
                        // Get actual viewport width (may have changed)
                        const actualWidth = containerRef.current?.getBoundingClientRect().width ?? viewport.width;
                        if (actualWidth > 0) {
                            // Calculate zoom to show 20m around beji (40m total view)
                            const desiredViewWidthMeters = 40; // 20m on each side
                            const calculatedPixelsPerMeter = actualWidth / desiredViewWidthMeters;
                            // Force zoom initialization by setting it directly
                            // Use setTimeout to ensure localStorage zoom has been loaded first
                            setTimeout(() => {
                                setPixelsPerMeter(calculatedPixelsPerMeter);
                                // Reset camera offset to center on beji
                                setCameraOffset({ x: 0, y: 0 });
                                lastInitializedBejiIdRef.current = currentBeji.id;
                                hasInitializedForWorldRef.current.add(currentBeji.worldId);
                            }, 0);
                        }
                    }
                });
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [currentBeji, viewport.width, beji, pixelsPerMeter, setPixelsPerMeter, setCameraOffset]);
    const cameraCenterX = cameraTarget.x + cameraOffset.x;
    const cameraCenterY = cameraTarget.y + cameraOffset.y;

    // Zoom-driven view size in world meters
    const viewWidth = Math.min(MAP_SIZE, viewport.width / Math.max(1, pixelsPerMeter));
    const viewHeight = Math.min(MAP_SIZE, viewport.height / Math.max(1, pixelsPerMeter));

    const viewX = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - viewWidth, cameraCenterX - viewWidth / 2));
    const viewY = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - viewHeight, cameraCenterY - viewHeight / 2));

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
            const targetX = b.target?.x ?? b.position.x;
            const targetY = b.target?.y ?? b.position.y;
            window.localStorage.setItem(
                "beji:lastPosition",
                JSON.stringify({ x: Math.round(targetX), y: Math.round(targetY) })
            );
        } catch {
          // Ignore localStorage errors
        }
    }, [beji, currentPlayerId]);

    // Initialize physics positions from beji atom
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

    // Sync beji position and target to Redis when target changes
    useEffect(() => {
        if (!currentBeji) return;

        // Sync when beji target changes
        const target = currentBeji.target ?? currentBeji.position;
        
        // Get current physics position
        const physicsPos = physicsPositionsRef.current.get(currentBeji.id);
        const currentPosition = physicsPos ?? currentBeji.position;

        // Send update to server (syncs position and target)
        sendUpdate(currentPosition, target, currentBeji.walk).catch((error) => {
            console.error("Failed to sync beji position:", error);
        });
    }, [currentBeji?.target?.x, currentBeji?.target?.y, currentBeji?.walk, currentBeji?.id, sendUpdate]);

    // Periodically sync position from physics simulation
    useEffect(() => {
        if (!currentBeji) return;

        const interval = setInterval(() => {
            const physicsPos = physicsPositionsRef.current.get(currentBeji.id);
            if (physicsPos && currentBeji) {
                const target = currentBeji.target ?? currentBeji.position;
                sendUpdate(physicsPos, target, currentBeji.walk).catch((error) => {
                    console.error("Failed to sync beji position:", error);
                });
            }
        }, 1000); // Sync every second

        return () => clearInterval(interval);
    }, [currentBeji?.id, sendUpdate, currentBeji?.target, currentBeji?.walk]);

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
                    const targetX = b.target?.x ?? b.position.x;
                    const targetY = b.target?.y ?? b.position.y;
                    const dx = targetX - pos.x;
                    const dy = targetY - pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 1e-3) {
                        physicsPositionsRef.current.set(b.id, { x: targetX, y: targetY });
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

    const fullInventory = useAtomValue(inventoryAtom);
    
    const handleHarvestStaticBeji = (codepoint: number) => {
        const newInv = { ...fullInventory };
        if (!newInv[currentPlayerId]) {
            newInv[currentPlayerId] = {};
        }
        const playerInv = { ...newInv[currentPlayerId] };
        playerInv[codepoint] = (playerInv[codepoint] || 0) + 1;
        newInv[currentPlayerId] = playerInv;
        setInventory(newInv);
    };

    const mouseHandlers = useMouseHandlers({
        isTouchPreferred,
        followMouse,
        currentPlayerId,
        beji,
        setBeji,
        staticBeji,
        setStaticBeji,
        onHarvestStaticBeji: handleHarvestStaticBeji,
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
    }, [followMouse, mouseHandlers]);

    // Render loop (draw only; no simulation)
    useEffect(() => {
        let raf = 0;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const canvasEl = canvas;
        const ctx2 = ctx;

        function draw(ts: number) {
            // ts is used for animation timing
            void ts;

            // Update camera target from physics position (for smooth following)
            // Don't update camera when beji is walking to prevent scrolling
            // Also don't update when user is dragging to pan the view
            if (!mouseHandlers.isDraggingRef.current) {
                const focus = currentPlayerId ? bejiRef.current.find((b) => b.playerId === currentPlayerId) : bejiRef.current[0];
                if (focus && !focus.walk) {
                    const physicsPos = physicsPositionsRef.current.get(focus.id);
                    if (physicsPos) {
                        cameraTargetRef.current = { x: physicsPos.x, y: physicsPos.y };
                    } else {
                        cameraTargetRef.current = { x: focus.position.x, y: focus.position.y };
                    }
                }
            }

            // Recalculate viewport based on updated camera target
            const currentCameraCenterX = cameraTargetRef.current.x + cameraOffset.x;
            const currentCameraCenterY = cameraTargetRef.current.y + cameraOffset.y;
            const currentViewWidth = Math.min(MAP_SIZE, viewport.width / Math.max(1, pixelsPerMeter));
            const currentViewHeight = Math.min(MAP_SIZE, viewport.height / Math.max(1, pixelsPerMeter));
            const currentViewX = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - currentViewWidth, currentCameraCenterX - currentViewWidth / 2));
            const currentViewY = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - currentViewHeight, currentCameraCenterY - currentViewHeight / 2));
            const currentRenderViewX = mounted ? currentViewX : 0;
            const currentRenderViewY = mounted ? currentViewY : 0;
            const currentRenderViewWidth = mounted ? currentViewWidth : MAP_SIZE;
            const currentRenderViewHeight = mounted ? currentViewHeight : MAP_SIZE;

            // Setup canvas and transformation
            setupCanvas({
                canvas: canvasEl,
                ctx: ctx2,
                viewport,
                renderViewX: currentRenderViewX,
                renderViewY: currentRenderViewY,
                renderViewWidth: currentRenderViewWidth,
                renderViewHeight: currentRenderViewHeight,
            });

            // Draw background
            drawBackground({
                ctx: ctx2,
                renderViewX: currentRenderViewX,
                renderViewY: currentRenderViewY,
                renderViewWidth: currentRenderViewWidth,
                renderViewHeight: currentRenderViewHeight,
            });

            // Draw grid
            drawGrid({
                ctx: ctx2,
                canvas: canvasEl,
                renderViewX: currentRenderViewX,
                renderViewY: currentRenderViewY,
                renderViewWidth: currentRenderViewWidth,
                renderViewHeight: currentRenderViewHeight,
            });

            // Draw origin marker
            drawOriginMarker({
                ctx: ctx2,
                canvas: canvasEl,
                renderViewX: currentRenderViewX,
                renderViewY: currentRenderViewY,
                renderViewWidth: currentRenderViewWidth,
                renderViewHeight: currentRenderViewHeight,
            });

            // Draw static beji entities (before player beji so they appear behind)
            const playerBeji = bejiRef.current.find((bb) => bb.playerId === currentPlayerId);
            const playerPos = playerBeji 
                ? (physicsPositionsRef.current.get(playerBeji.id) ?? { x: playerBeji.position.x, y: playerBeji.position.y })
                : null;
            drawStaticBeji({
                ctx: ctx2,
                canvas: canvasEl,
                staticBeji: staticBeji,
                playerPosition: playerPos,
                renderViewX: currentRenderViewX,
                renderViewY: currentRenderViewY,
                renderViewWidth: currentRenderViewWidth,
                renderViewHeight: currentRenderViewHeight,
                pixelsPerMeter,
            });

            // Draw beji entities
            drawBeji({
                ctx: ctx2,
                canvas: canvasEl,
                beji: bejiRef.current,
                physicsPositions: physicsPositionsRef.current,
                renderViewX: currentRenderViewX,
                renderViewY: currentRenderViewY,
                renderViewWidth: currentRenderViewWidth,
                renderViewHeight: currentRenderViewHeight,
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
                        renderViewX: currentRenderViewX,
                        renderViewY: currentRenderViewY,
                        renderViewWidth: currentRenderViewWidth,
                        renderViewHeight: currentRenderViewHeight,
                    });
                }
            }

            // Draw debug overlay
            drawDebugOverlay({
                ctx: ctx2,
                mouseWorld: mouseHandlers.mouseWorldRef.current,
                beji: bejiRef.current,
                physicsPositions: physicsPositionsRef.current,
                pixelsPerMeter,
                renderViewX: currentRenderViewX,
                renderViewY: currentRenderViewY,
                renderViewWidth: currentRenderViewWidth,
                renderViewHeight: currentRenderViewHeight,
                followMouse: followMouseRef.current,
            });

            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [viewport.width, viewport.height, pixelsPerMeter, cameraOffset, mounted, currentPlayerId, staticBeji]);

    // Attach wheel event listener with non-passive option to allow preventDefault
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const handleWheel = (e: WheelEvent) => {
            mouseHandlers.handleWheel(e);
        };
        
        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, [mouseHandlers.handleWheel]);


    return (
        <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%", height: "100%", overflow: "hidden", position: "relative", border: "2px solid #e5e7eb" }}>
            <ActionsBar
                followMouse={followMouse}
                onToggleFollowMouse={setFollowMouse}
                currentPlayerId={currentPlayerId}
                setCameraOffset={setCameraOffset}
                getPhysicsPosition={(bejiId) => physicsPositionsRef.current.get(bejiId)}
                setBeji={setBeji}
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


