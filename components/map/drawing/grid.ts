/**
 * Grid drawing utilities
 */

import { MAP_SIZE } from "../../../lib/constants";

type GridParams = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
};

/**
 * Draws grid lines every 1 meter; darker every 10 meters
 */
export function drawGrid({
    ctx,
    canvas,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
}: GridParams) {
    ctx.lineWidth = 1 / Math.max(1, (canvas.width / renderViewWidth));
    
    // Vertical lines
    const gxStart = Math.max(0, Math.floor(renderViewX));
    const gxEnd = Math.min(MAP_SIZE, Math.ceil(renderViewX + renderViewWidth));
    for (let x = gxStart; x <= gxEnd; x += 1) {
        ctx.beginPath();
        ctx.strokeStyle = x % 10 === 0 ? "#d1d5db" : "#eef2f7";
        ctx.moveTo(x, renderViewY);
        ctx.lineTo(x, renderViewY + renderViewHeight);
        ctx.stroke();
    }
    
    // Horizontal lines
    const gyStart = Math.max(0, Math.floor(renderViewY));
    const gyEnd = Math.min(MAP_SIZE, Math.ceil(renderViewY + renderViewHeight));
    for (let y = gyStart; y <= gyEnd; y += 1) {
        ctx.beginPath();
        ctx.strokeStyle = y % 10 === 0 ? "#d1d5db" : "#eef2f7";
        ctx.moveTo(renderViewX, y);
        ctx.lineTo(renderViewX + renderViewWidth, y);
        ctx.stroke();
    }
}

