import { useRef, useState } from "react";
import type { Beji, StaticBeji } from "../atoms";
import { MAP_SIZE } from "../../lib/constants";

type UseMouseHandlersProps = {
    isTouchPreferred: boolean;
    followMouse: boolean;
    currentPlayerId: string;
    beji: Beji[];
    setBeji: (beji: Beji[]) => void;
    staticBeji: StaticBeji[];
    setStaticBeji: (staticBeji: StaticBeji[]) => void;
    onHarvestStaticBeji: (codepoint: number) => void;
    cameraTarget: { x: number; y: number };
    cameraOffset: { x: number; y: number };
    setCameraOffset: (offset: { x: number; y: number }) => void;
    pixelsPerMeter: number;
    setPixelsPerMeter: (pixelsPerMeter: number) => void;
    viewport: { width: number; height: number };
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    physicsPositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
    bejiHoverRadiusMeters?: number;
};

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

const HARVEST_DISTANCE_METERS = 2;

export function useMouseHandlers({
    isTouchPreferred,
    followMouse,
    currentPlayerId,
    beji,
    setBeji,
    staticBeji,
    setStaticBeji,
    onHarvestStaticBeji,
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
    bejiHoverRadiusMeters = 0.6,
}: UseMouseHandlersProps) {
    const followMouseRef = useRef<boolean>(followMouse);
    const lastPointerClientRef = useRef<{ x: number; y: number } | null>(null);
    const isPlayerBejiHoveredRef = useRef(false);
    const mouseWorldRef = useRef<{ x: number; y: number } | null>(null);

    // Drag-to-pan state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{
        clientX: number;
        clientY: number;
        offsetX: number;
        offsetY: number;
        viewWidth: number;
        viewHeight: number;
    } | null>(null);

    followMouseRef.current = followMouse;

    const clientToWorld = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const px = (clientX - rect.left) / Math.max(1, rect.width);
        const py = (clientY - rect.top) / Math.max(1, rect.height);
        const x = renderViewX + px * renderViewWidth;
        const y = renderViewY + py * renderViewHeight;
        return { x: clamp(x, -MAP_SIZE / 2, MAP_SIZE / 2), y: clamp(y, -MAP_SIZE / 2, MAP_SIZE / 2) };
    };

    const setTargetTo = (worldX: number, worldY: number) => {
        if (!currentPlayerId) return;
        const updated: Beji[] = beji.map((b: Beji) => (
            b.playerId === currentPlayerId
                ? { ...b, target: { x: clamp(worldX, -MAP_SIZE / 2, MAP_SIZE / 2), y: clamp(worldY, -MAP_SIZE / 2, MAP_SIZE / 2) } }
                : b
        ));
        setBeji(updated);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isTouchPreferred) return;
        lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
        const { x, y } = clientToWorld(e.clientX, e.clientY);
        mouseWorldRef.current = { x, y };

        // Handle drag-to-pan (update cameraOffset in world space based on pixel delta)
        if (isDragging && dragStartRef.current) {
            const canvas = canvasRef.current;
            if (canvas) {
                const dxPx = e.clientX - dragStartRef.current.clientX;
                const dyPx = e.clientY - dragStartRef.current.clientY;
                const dxWorld = (dxPx / Math.max(1, canvas.width)) * dragStartRef.current.viewWidth;
                const dyWorld = (dyPx / Math.max(1, canvas.height)) * dragStartRef.current.viewHeight;

                // Dragging right moves map right with cursor (content follows), so offset decreases
                let nextOffsetX = dragStartRef.current.offsetX - dxWorld;
                let nextOffsetY = dragStartRef.current.offsetY - dyWorld;

                // Clamp using desired center within bounds at the start's view size
                const desiredCenterX = cameraTarget.x + nextOffsetX;
                const desiredCenterY = cameraTarget.y + nextOffsetY;
                let nextViewX = desiredCenterX - dragStartRef.current.viewWidth / 2;
                let nextViewY = desiredCenterY - dragStartRef.current.viewHeight / 2;
                nextViewX = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - dragStartRef.current.viewWidth, nextViewX));
                nextViewY = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - dragStartRef.current.viewHeight, nextViewY));
                const clampedCenterX = nextViewX + dragStartRef.current.viewWidth / 2;
                const clampedCenterY = nextViewY + dragStartRef.current.viewHeight / 2;
                nextOffsetX = clampedCenterX - cameraTarget.x;
                nextOffsetY = clampedCenterY - cameraTarget.y;

                setCameraOffset({ x: nextOffsetX, y: nextOffsetY });
            }
            return; // do not update target while dragging
        }
        // hover detection against smoothed position if available, else current beji pos
        const playerBeji = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : undefined;
        if (playerBeji) {
            const pos = physicsPositionsRef.current.get(playerBeji.id) ?? { x: playerBeji.position.x, y: playerBeji.position.y };
            const dx = x - pos.x;
            const dy = y - pos.y;
            const isHover = Math.sqrt(dx * dx + dy * dy) <= bejiHoverRadiusMeters;
            isPlayerBejiHoveredRef.current = isHover;
        } else {
            isPlayerBejiHoveredRef.current = false;
        }
        if (isPlayerBejiHoveredRef.current) return;
        if (!followMouseRef.current) return;
        setTargetTo(x, y);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isTouchPreferred) return;
        if (e.button !== 0) return; // left button only
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Check for static beji click first
        const clickWorld = clientToWorld(e.clientX, e.clientY);
        const playerBeji = currentPlayerId ? beji.find((b) => b.playerId === currentPlayerId) : undefined;
        if (playerBeji) {
            const playerPos = physicsPositionsRef.current.get(playerBeji.id) ?? { x: playerBeji.position.x, y: playerBeji.position.y };
            
            // Check each static beji for click within harvest distance
            for (const sb of staticBeji) {
                if (sb.harvested) continue;
                
                const dx = clickWorld.x - sb.position.x;
                const dy = clickWorld.y - sb.position.y;
                const clickDistance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if click is on static beji and player is within harvest distance
                const playerDx = sb.position.x - playerPos.x;
                const playerDy = sb.position.y - playerPos.y;
                const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                
                if (clickDistance <= 0.6 && playerDistance <= HARVEST_DISTANCE_METERS) {
                    // Harvest this static beji
                    const updatedStaticBeji = staticBeji.map((s) =>
                        s.id === sb.id ? { ...s, harvested: true } : s
                    );
                    setStaticBeji(updatedStaticBeji);
                    
                    // Add to inventory
                    onHarvestStaticBeji(sb.emojiCodepoint);
                    
                    // Don't start dragging if we harvested a beji
                    return;
                }
            }
        }

        setIsDragging(true);
        dragStartRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            offsetX: cameraOffset.x,
            offsetY: cameraOffset.y,
            viewWidth: renderViewWidth,
            viewHeight: renderViewHeight,
        };
    };

    const endDrag = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
        if (isTouchPreferred) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        const nextPixelsPerMeter = Math.max(2, Math.min(400, pixelsPerMeter * factor));

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

        // Desired view size after zoom (clamped to map bounds)
        const nextViewWidth = Math.min(MAP_SIZE, viewport.width / Math.max(1, nextPixelsPerMeter));
        const nextViewHeight = Math.min(MAP_SIZE, viewport.height / Math.max(1, nextPixelsPerMeter));

        // Desired camera center so that the same world point stays under the cursor
        let desiredCenterX = worldBeforeX + (0.5 - px) * nextViewWidth;
        let desiredCenterY = worldBeforeY + (0.5 - py) * nextViewHeight;

        // Clamp to map bounds by clamping the future view rect
        let nextViewX = desiredCenterX - nextViewWidth / 2;
        let nextViewY = desiredCenterY - nextViewHeight / 2;
        nextViewX = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - nextViewWidth, nextViewX));
        nextViewY = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2 - nextViewHeight, nextViewY));
        desiredCenterX = nextViewX + nextViewWidth / 2;
        desiredCenterY = nextViewY + nextViewHeight / 2;

        // Update zoom and camera offset relative to player-follow target
        setPixelsPerMeter(nextPixelsPerMeter);

        // Only update camera offset if we're not clamped to the map bounds
        // This prevents jumps when zooming out to the minimum where view covers entire map
        const isClamped = nextViewX <= -MAP_SIZE / 2 && nextViewY <= -MAP_SIZE / 2 &&
            nextViewWidth >= MAP_SIZE && nextViewHeight >= MAP_SIZE;

        if (!isClamped) {
            setCameraOffset({
                x: desiredCenterX - cameraTarget.x,
                y: desiredCenterY - cameraTarget.y,
            });
        } else {
            // When fully zoomed out, reset offset to center on player
            setCameraOffset({ x: 0, y: 0 });
        }
    };

    return {
        handleMouseMove,
        handleMouseDown,
        endDrag,
        handleWheel,
        isDragging,
        mouseWorldRef,
        lastPointerClientRef,
        clientToWorld,
        setTargetTo,
    };
}

