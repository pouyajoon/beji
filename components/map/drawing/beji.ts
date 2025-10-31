/**
 * Beji entity drawing utilities
 */

import type { Beji } from "../../atoms";

type BejiParams = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    beji: Beji[];
    physicsPositions: Map<string, { x: number; y: number }>;
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
    pixelsPerMeter: number;
};

/**
 * Draws beji entities from physics positions
 */
export function drawBeji({
    ctx,
    canvas,
    beji,
    physicsPositions,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
    pixelsPerMeter,
}: BejiParams) {
    for (const b of beji) {
        const p = physicsPositions.get(b.id) ?? { x: b.position.x, y: b.position.y };

        // draw emoji in screen space so size tracks pixels per meter cleanly
        const screenX = (p.x - renderViewX) * (canvas.width / renderViewWidth);
        const screenY = (p.y - renderViewY) * (canvas.height / renderViewHeight);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        // Ensure beji remains readable when zoomed out by enforcing a minimum on-screen size (in CSS px)
        const minEmojiCssPx = 24; // minimum visible size on screen
        const emojiCssPx = Math.max(minEmojiCssPx, 0.7 * pixelsPerMeter);
        ctx.font = `${emojiCssPx * dpr}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.emoji, screenX, screenY);
        ctx.restore();
    }
}

