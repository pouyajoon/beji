/**
 * World origin marker drawing utilities
 */

type OriginMarkerParams = {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
};

/**
 * Draws world origin marker (0,0) with ⭕ in screen space for consistent size
 */
export function drawOriginMarker({
    ctx,
    canvas,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
}: OriginMarkerParams) {
    const originScreenX = (0 - renderViewX) * (canvas.width / renderViewWidth);
    const originScreenY = (0 - renderViewY) * (canvas.height / renderViewHeight);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.font = `${16 * dpr}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭕", originScreenX, originScreenY);
    ctx.restore();
}

