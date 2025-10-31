/**
 * Background drawing utilities
 */

type BackgroundParams = {
    ctx: CanvasRenderingContext2D;
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
};

/**
 * Draws the background
 */
export function drawBackground({
    ctx,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
}: BackgroundParams) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(renderViewX, renderViewY, renderViewWidth, renderViewHeight);
}

