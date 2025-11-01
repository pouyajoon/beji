/**
 * Static Beji entity drawing utilities
 */

import type { StaticBeji } from "../../atoms";

type StaticBejiParams = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    staticBeji: StaticBeji[];
    playerPosition: { x: number; y: number } | null;
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
    pixelsPerMeter: number;
};

const HARVEST_DISTANCE_METERS = 2;

/**
 * Draws static beji entities with grey circles
 */
export function drawStaticBeji({
    ctx,
    canvas,
    staticBeji,
    playerPosition,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
    pixelsPerMeter,
}: StaticBejiParams) {
    for (const sb of staticBeji) {
        const screenX = (sb.position.x - renderViewX) * (canvas.width / renderViewWidth);
        const screenY = (sb.position.y - renderViewY) * (canvas.height / renderViewHeight);

        // Check if player is within harvest distance
        let isNear = false;
        if (playerPosition) {
            const dx = sb.position.x - playerPosition.x;
            const dy = sb.position.y - playerPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            isNear = distance <= HARVEST_DISTANCE_METERS;
        }

        // Draw circle (grey if not near/harvested, light grey if near/harvested)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        
        // Circle radius in world meters (0.5m radius)
        const circleRadiusMeters = 0.5;
        const circleRadiusPx = circleRadiusMeters * pixelsPerMeter;
        const minRadiusPx = 15; // minimum visible radius on screen
        const radius = Math.max(minRadiusPx, circleRadiusPx);

        // Draw circle border
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = (sb.harvested || isNear) ? "#d3d3d3" : "#808080"; // light grey if near/harvested, grey otherwise
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw emoji
        const minEmojiCssPx = 20;
        const emojiCssPx = Math.max(minEmojiCssPx, 0.6 * pixelsPerMeter);
        ctx.font = `${emojiCssPx * dpr}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sb.emoji, screenX, screenY);
        ctx.restore();
    }
}

