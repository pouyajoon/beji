/**
 * Guidance line and ETA drawing utilities
 */

import { BEJI_SPEED_MPS } from "../../../lib/constants";

type GuidanceLineParams = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    playerBeji: { x: number; y: number } | null;
    mouseWorld: { x: number; y: number } | null;
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
};

/**
 * Draws guidance line and ETA from player's beji to mouse
 */
export function drawGuidanceLine({
    ctx,
    canvas,
    playerBeji,
    mouseWorld,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
}: GuidanceLineParams) {
    if (!playerBeji || !mouseWorld) return;

    const dx = mouseWorld.x - playerBeji.x;
    const dy = mouseWorld.y - playerBeji.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 1e-3) return;

    // world-space line
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2 / Math.max(1, (canvas.width / renderViewWidth));
    ctx.setLineDash([1.5, 1.5]);
    ctx.beginPath();
    ctx.moveTo(playerBeji.x, playerBeji.y);
    ctx.lineTo(mouseWorld.x, mouseWorld.y);
    ctx.stroke();
    ctx.restore();

    // ETA label in screen space near the mouse position (independent of zoom)
    const etaSec = dist / BEJI_SPEED_MPS;
    
    // Format distance: show meters if < 1000m, otherwise show kilometers
    let distanceText: string;
    if (dist < 1000) {
        distanceText = `${Math.round(dist)} m`;
    } else {
        distanceText = `${(dist / 1000).toFixed(2)} km`;
    }
    
    const etaText = `${etaSec.toFixed(1)}s`;
    const fullText = `${etaText} · ${distanceText}`;
    const mouseScreenX = (mouseWorld.x - renderViewX) * (canvas.width / renderViewWidth);
    const mouseScreenY = (mouseWorld.y - renderViewY) * (canvas.height / renderViewHeight);
    const dpr = window.devicePixelRatio || 1;
    const fontPx = 18 * dpr; // larger constant px size regardless of zoom
    const padding = 4 * dpr;
    const margin = 6 * dpr;
    // offset label slightly away from mouse cursor
    const normX = dx / dist;
    const normY = dy / dist;
    // perpendicular offset to avoid overlapping the line; also push forward
    const offX = normX * 8 - normY * 8;
    const offY = normY * 8 + normX * 8;
    let labelX = mouseScreenX + offX;
    let labelY = mouseScreenY + offY;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const metrics = ctx.measureText(fullText);
    const textW = metrics.width;
    const textH = fontPx;

    // clamp inside canvas bounds
    const minX = margin + textW / 2 + padding;
    const maxX = canvas.width - (margin + textW / 2 + padding);
    const minY = margin + textH + padding;
    const maxY = canvas.height - margin;
    labelX = Math.max(minX, Math.min(maxX, labelX));
    labelY = Math.max(minY, Math.min(maxY, labelY));

    // backdrop for readability
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(labelX - textW / 2 - padding, labelY - textH - padding, textW + padding * 2, textH + padding);
    ctx.fillStyle = "#111827";
    ctx.fillText(fullText, labelX, labelY - 2);
    ctx.restore();
}

