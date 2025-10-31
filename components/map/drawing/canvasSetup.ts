/**
 * Canvas setup and transformation utilities
 */

type CanvasSetupParams = {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    renderViewX: number;
    renderViewY: number;
    renderViewWidth: number;
    renderViewHeight: number;
};

/**
 * Sets up canvas size and applies world-to-screen transformation
 */
export function setupCanvas({
    canvas,
    ctx,
    viewport,
    renderViewX,
    renderViewY,
    renderViewWidth,
    renderViewHeight,
}: CanvasSetupParams) {
    // Resize canvas to device pixels for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Clear and set up world-to-screen transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // world-to-screen scale (pixels per meter)
    const zoom = canvas.width / renderViewWidth; // equals pixelsPerMeter when widths match
    ctx.scale(zoom, canvas.height / renderViewHeight);
    ctx.translate(-renderViewX, -renderViewY);
}

