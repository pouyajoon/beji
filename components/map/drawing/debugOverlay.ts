/**
 * Debug overlay drawing utilities
 */

import type { Beji } from "../../atoms";
import { BEJI_SPEED_MPS } from "../../../lib/constants";

type DebugOverlayParams = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    mouseWorld: { x: number; y: number } | null;
    beji: Beji[];
    physicsPositions: Map<string, { x: number; y: number }>;
    pixelsPerMeter: number;
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
    followMouse: boolean;
};

/**
 * Draws debug overlay at top-left in screen space
 */
export function drawDebugOverlay({
    ctx,
    canvas,
    mouseWorld,
    beji,
    physicsPositions,
    pixelsPerMeter,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
    followMouse,
}: DebugOverlayParams) {
    const bejiLines = beji.map((b) => {
        const p = physicsPositions.get(b.id) ?? { x: b.position?.x ?? 0, y: b.position?.y ?? 0 };
        const posX = typeof p.x === 'number' ? p.x.toFixed(2) : '?';
        const posY = typeof p.y === 'number' ? p.y.toFixed(2) : '?';
        const targetX = typeof b.target?.x === 'number' ? b.target.x.toFixed(2) : '?';
        const targetY = typeof b.target?.y === 'number' ? b.target.y.toFixed(2) : '?';
        
        // Calculate speed: if beji is moving (walk is true and distance to target > threshold), use BEJI_SPEED_MPS, otherwise 0
        let speedMps = 0;
        if (b.walk && typeof p.x === 'number' && typeof p.y === 'number' && typeof b.target?.x === 'number' && typeof b.target?.y === 'number') {
            const dx = b.target.x - p.x;
            const dy = b.target.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1e-3) {
                speedMps = BEJI_SPEED_MPS;
            }
        }
        const speedKmh = speedMps * 3.6; // Convert m/s to km/h
        const speedText = `speed: ${speedMps.toFixed(1)} m/s (${speedKmh.toFixed(1)} km/h)`;
        
        return `${b.emoji}  pos:(${posX},${posY})  target:(${targetX},${targetY})  ${speedText}  (player:${b.playerId ?? "-"})`;
    });
    const lines = [
        `zoom: ${Math.round(pixelsPerMeter)} px/m`,
        `view: x:${renderViewX.toFixed(2)} y:${renderViewY.toFixed(2)} w:${renderViewWidth.toFixed(2)} h:${renderViewHeight.toFixed(2)}`,
        mouseWorld ? `mouse: x:${mouseWorld.x.toFixed(2)} y:${mouseWorld.y.toFixed(2)}` : `mouse: -`,
        `follow: ${followMouse ? "on" : "off"}`,
        `beji:`,
        ...bejiLines,
    ];

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    const fontPx = 11 * dpr;
    const lineH = 14 * dpr;
    const padding = 6 * dpr;
    const margin = 12 * dpr;
    ctx.font = `${fontPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    let maxW = 0;
    for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxW) maxW = w;
    }
    const boxW = Math.min(maxW + padding * 2, Math.max(160, maxW + padding * 2));
    const boxH = padding * 2 + lines.length * lineH;
    const boxX = margin;
    const boxY = margin;
    // background
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();
    // text
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        ctx.fillText(line, boxX + padding, boxY + padding + i * lineH);
    }
    ctx.restore();
}

