/**
 * Debug overlay drawing utilities
 */

import type { Beji } from "../../atoms";

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
        return `${b.emoji}  pos:(${posX},${posY})  target:(${targetX},${targetY})  (player:${b.playerId ?? "-"})`;
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

