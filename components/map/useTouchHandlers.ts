import { useRef, useEffect } from "react";
import { getTouchDistance, getTouchCenter } from "./touchUtils";
import { MAP_SIZE } from "../../lib/constants";

type TouchState = {
    touches: Array<{ id: number; clientX: number; clientY: number }>;
    initialDistance: number | null;
    initialPixelsPerMeter: number;
    initialCenter: { x: number; y: number } | null;
    initialOffset: { x: number; y: number };
    isPanning: boolean;
    panStart: { clientX: number; clientY: number; offsetX: number; offsetY: number; viewWidth: number; viewHeight: number } | null;
};

type UseTouchHandlersProps = {
    isTouchPreferred: boolean;
    pixelsPerMeter: number;
    cameraTarget: { x: number; y: number };
    cameraOffset: { x: number; y: number };
    setCameraOffset: (offset: { x: number; y: number }) => void;
    setPixelsPerMeter: (pixelsPerMeter: number) => void;
    viewport: { width: number; height: number };
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export function useTouchHandlers({
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
}: UseTouchHandlersProps) {
    // Touch gesture state
    const touchStateRef = useRef<TouchState>({
        touches: [],
        initialDistance: null,
        initialPixelsPerMeter: pixelsPerMeter,
        initialCenter: null,
        initialOffset: { x: 0, y: 0 },
        isPanning: false,
        panStart: null,
    });

    // Sync initialPixelsPerMeter when zoom changes (but not during an active pinch)
    useEffect(() => {
        if (touchStateRef.current.initialDistance === null) {
            touchStateRef.current.initialPixelsPerMeter = pixelsPerMeter;
        }
    }, [pixelsPerMeter]);

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isTouchPreferred) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const touches = Array.from(e.touches);
        touchStateRef.current.touches = touches.map(t => ({
            id: t.identifier,
            clientX: t.clientX,
            clientY: t.clientY,
        }));

        if (touches.length === 1) {
            // Single touch - prepare for panning
            const touch = touches[0]!;
            touchStateRef.current.isPanning = true;
            touchStateRef.current.panStart = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                offsetX: cameraOffset.x,
                offsetY: cameraOffset.y,
                viewWidth: renderViewWidth,
                viewHeight: renderViewHeight,
            };
        } else if (touches.length === 2) {
            // Two touches - prepare for pinch zoom
            const distance = getTouchDistance(touches[0]!, touches[1]!);
            const center = getTouchCenter(touches[0]!, touches[1]!);
            touchStateRef.current.initialDistance = distance;
            touchStateRef.current.initialPixelsPerMeter = pixelsPerMeter;
            touchStateRef.current.initialOffset = { ...cameraOffset };
            touchStateRef.current.initialCenter = center;
            touchStateRef.current.isPanning = false;
            touchStateRef.current.panStart = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isTouchPreferred) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const touches = Array.from(e.touches);

        if (touches.length === 1 && touchStateRef.current.isPanning && touchStateRef.current.panStart) {
            // Single finger panning
            const touch = touches[0]!;
            const dxPx = touch.clientX - touchStateRef.current.panStart.clientX;
            const dyPx = touch.clientY - touchStateRef.current.panStart.clientY;
            const dxWorld = (dxPx / Math.max(1, canvas.width)) * touchStateRef.current.panStart.viewWidth;
            const dyWorld = (dyPx / Math.max(1, canvas.height)) * touchStateRef.current.panStart.viewHeight;

            let nextOffsetX = touchStateRef.current.panStart.offsetX - dxWorld;
            let nextOffsetY = touchStateRef.current.panStart.offsetY - dyWorld;

            // Clamp to bounds
            const desiredCenterX = cameraTarget.x + nextOffsetX;
            const desiredCenterY = cameraTarget.y + nextOffsetY;
            let nextViewX = desiredCenterX - touchStateRef.current.panStart.viewWidth / 2;
            let nextViewY = desiredCenterY - touchStateRef.current.panStart.viewHeight / 2;
            nextViewX = Math.max(0, Math.min(MAP_SIZE - touchStateRef.current.panStart.viewWidth, nextViewX));
            nextViewY = Math.max(0, Math.min(MAP_SIZE - touchStateRef.current.panStart.viewHeight, nextViewY));
            const clampedCenterX = nextViewX + touchStateRef.current.panStart.viewWidth / 2;
            const clampedCenterY = nextViewY + touchStateRef.current.panStart.viewHeight / 2;
            nextOffsetX = clampedCenterX - cameraTarget.x;
            nextOffsetY = clampedCenterY - cameraTarget.y;

            setCameraOffset({ x: nextOffsetX, y: nextOffsetY });
        } else if (touches.length === 2 && touchStateRef.current.initialDistance !== null) {
            // Two finger pinch zoom
            const distance = getTouchDistance(touches[0]!, touches[1]!);
            const scale = distance / touchStateRef.current.initialDistance;
            const nextPixelsPerMeter = Math.max(2, Math.min(400, touchStateRef.current.initialPixelsPerMeter * scale));

            // Get the center point of the pinch gesture
            const center = getTouchCenter(touches[0]!, touches[1]!);
            const rect = canvas.getBoundingClientRect();
            const px = (center.x - rect.left) / Math.max(1, rect.width);
            const py = (center.y - rect.top) / Math.max(1, rect.height);

            // World point under pinch center before zoom
            const worldBeforeX = renderViewX + px * renderViewWidth;
            const worldBeforeY = renderViewY + py * renderViewHeight;

            // Desired view size after zoom
            const nextViewWidth = Math.min(MAP_SIZE, viewport.width / Math.max(1, nextPixelsPerMeter));
            const nextViewHeight = Math.min(MAP_SIZE, viewport.height / Math.max(1, nextPixelsPerMeter));

            // Desired camera center so that the same world point stays under the pinch center
            let desiredCenterX = worldBeforeX + (0.5 - px) * nextViewWidth;
            let desiredCenterY = worldBeforeY + (0.5 - py) * nextViewHeight;

            // Clamp to map bounds
            let nextViewX = desiredCenterX - nextViewWidth / 2;
            let nextViewY = desiredCenterY - nextViewHeight / 2;
            nextViewX = Math.max(0, Math.min(MAP_SIZE - nextViewWidth, nextViewX));
            nextViewY = Math.max(0, Math.min(MAP_SIZE - nextViewHeight, nextViewY));
            desiredCenterX = nextViewX + nextViewWidth / 2;
            desiredCenterY = nextViewY + nextViewHeight / 2;

            // Update zoom and camera offset
            setPixelsPerMeter(nextPixelsPerMeter);

            const isClamped = nextViewX <= 0 && nextViewY <= 0 &&
                nextViewWidth >= MAP_SIZE && nextViewHeight >= MAP_SIZE;

            if (!isClamped) {
                setCameraOffset({
                    x: desiredCenterX - cameraTarget.x,
                    y: desiredCenterY - cameraTarget.y,
                });
            } else {
                setCameraOffset({ x: 0, y: 0 });
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isTouchPreferred) return;
        e.preventDefault();

        const remainingTouches = Array.from(e.touches);

        if (remainingTouches.length === 0) {
            // All touches released - reset state
            touchStateRef.current.touches = [];
            touchStateRef.current.initialDistance = null;
            touchStateRef.current.initialCenter = null;
            touchStateRef.current.isPanning = false;
            touchStateRef.current.panStart = null;
        } else if (remainingTouches.length === 1) {
            // Went from two touches to one - switch to pan mode
            const touch = remainingTouches[0]!;
            touchStateRef.current.touches = [{ id: touch.identifier, clientX: touch.clientX, clientY: touch.clientY }];
            touchStateRef.current.isPanning = true;
            touchStateRef.current.panStart = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                offsetX: cameraOffset.x,
                offsetY: cameraOffset.y,
                viewWidth: renderViewWidth,
                viewHeight: renderViewHeight,
            };
            touchStateRef.current.initialDistance = null;
            touchStateRef.current.initialCenter = null;
        }
    };

    return {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    };
}

