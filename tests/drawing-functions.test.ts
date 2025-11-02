/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { drawBackground } from '../components/map/drawing/background';
import { drawGrid } from '../components/map/drawing/grid';
import { drawOriginMarker } from '../components/map/drawing/originMarker';
import { drawGuidanceLine } from '../components/map/drawing/guidanceLine';
import { drawStaticBeji } from '../components/map/drawing/staticBeji';
import { drawBeji } from '../components/map/drawing/beji';
import { setupCanvas } from '../components/map/drawing/canvasSetup';
import type { Beji, StaticBeji } from '../components/atoms';

describe('drawBackground', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const mockCtx = {
            fillStyle: '',
            fillRect: () => {},
        };
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
    });

    it('should fill background with white', () => {
        expect(() => {
            drawBackground({
                ctx,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should handle different viewport sizes', () => {
        expect(() => {
            drawBackground({
                ctx,
                renderViewX: 10,
                renderViewY: 20,
                renderViewWidth: 200,
                renderViewHeight: 300,
            });
        }).not.toThrow();
    });
});

describe('drawGrid', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const mockCtx = {
            save: () => {},
            restore: () => {},
            setTransform: () => {},
            lineWidth: 1,
            strokeStyle: '',
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
        };
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
    });

    it('should draw grid lines without throwing', () => {
        expect(() => {
            drawGrid({
                ctx,
                canvas,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should handle viewport with offset', () => {
        expect(() => {
            drawGrid({
                ctx,
                canvas,
                renderViewX: -50,
                renderViewY: -50,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should handle large viewport', () => {
        expect(() => {
            drawGrid({
                ctx,
                canvas,
                renderViewX: -500,
                renderViewY: -500,
                renderViewWidth: 1000,
                renderViewHeight: 1000,
            });
        }).not.toThrow();
    });
});

describe('drawOriginMarker', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const mockCtx = {
            save: () => {},
            restore: () => {},
            setTransform: () => {},
            font: '',
            textAlign: 'left' as CanvasTextAlign,
            textBaseline: 'top' as CanvasTextBaseline,
            fillText: () => {},
        };
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            writable: true,
        });
    });

    it('should draw origin marker without throwing', () => {
        expect(() => {
            drawOriginMarker({
                ctx,
                canvas,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should handle origin outside viewport', () => {
        expect(() => {
            drawOriginMarker({
                ctx,
                canvas,
                renderViewX: 100,
                renderViewY: 100,
                renderViewWidth: 50,
                renderViewHeight: 50,
            });
        }).not.toThrow();
    });
});

describe('drawGuidanceLine', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const mockCtx = {
            save: () => {},
            restore: () => {},
            setTransform: () => {},
            globalAlpha: 1,
            strokeStyle: '',
            lineWidth: 1,
            setLineDash: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            font: '',
            textAlign: 'left' as CanvasTextAlign,
            textBaseline: 'top' as CanvasTextBaseline,
            measureText: () => ({ width: 50 }),
            fillStyle: '',
            fillRect: () => {},
            fillText: () => {},
        };
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            writable: true,
        });
    });

    it('should draw guidance line when both points provided', () => {
        expect(() => {
            drawGuidanceLine({
                ctx,
                canvas,
                playerBeji: { x: 0, y: 0 },
                mouseWorld: { x: 10, y: 10 },
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should not draw when player beji is null', () => {
        expect(() => {
            drawGuidanceLine({
                ctx,
                canvas,
                playerBeji: null,
                mouseWorld: { x: 10, y: 10 },
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should not draw when mouse world is null', () => {
        expect(() => {
            drawGuidanceLine({
                ctx,
                canvas,
                playerBeji: { x: 0, y: 0 },
                mouseWorld: null,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should not draw when points are very close', () => {
        expect(() => {
            drawGuidanceLine({
                ctx,
                canvas,
                playerBeji: { x: 0, y: 0 },
                mouseWorld: { x: 0.0001, y: 0.0001 },
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });
});

describe('drawStaticBeji', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const mockCtx = {
            save: () => {},
            restore: () => {},
            setTransform: () => {},
            beginPath: () => {},
            arc: () => {},
            strokeStyle: '',
            lineWidth: 1,
            stroke: () => {},
            font: '',
            textAlign: 'left' as CanvasTextAlign,
            textBaseline: 'top' as CanvasTextBaseline,
            fillText: () => {},
        };
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            writable: true,
        });
    });

    it('should draw static beji without throwing', () => {
        const staticBeji: StaticBeji[] = [
            {
                id: 'sb1',
                worldId: 'world1',
                emojiCodepoint: 0x1f600,
                emoji: '😀',
                position: { x: 0, y: 0 },
                harvested: false,
            },
        ];

        expect(() => {
            drawStaticBeji({
                ctx,
                canvas,
                staticBeji,
                playerPosition: null,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });

    it('should handle empty static beji array', () => {
        expect(() => {
            drawStaticBeji({
                ctx,
                canvas,
                staticBeji: [],
                playerPosition: null,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });

    it('should handle multiple static bejis', () => {
        const staticBeji: StaticBeji[] = [
            {
                id: 'sb1',
                worldId: 'world1',
                emojiCodepoint: 0x1f600,
                emoji: '😀',
                position: { x: 0, y: 0 },
                harvested: false,
            },
            {
                id: 'sb2',
                worldId: 'world1',
                emojiCodepoint: 0x1f601,
                emoji: '😁',
                position: { x: 10, y: 10 },
                harvested: true,
            },
        ];

        expect(() => {
            drawStaticBeji({
                ctx,
                canvas,
                staticBeji,
                playerPosition: null,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });

    it('should handle player position for proximity check', () => {
        const staticBeji: StaticBeji[] = [
            {
                id: 'sb1',
                worldId: 'world1',
                emojiCodepoint: 0x1f600,
                emoji: '😀',
                position: { x: 0, y: 0 },
                harvested: false,
            },
        ];

        expect(() => {
            drawStaticBeji({
                ctx,
                canvas,
                staticBeji,
                playerPosition: { x: 1, y: 1 }, // Within harvest distance
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });
});

describe('drawBeji', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const mockCtx = {
            save: () => {},
            restore: () => {},
            setTransform: () => {},
            font: '',
            textAlign: 'left' as CanvasTextAlign,
            textBaseline: 'top' as CanvasTextBaseline,
            fillText: () => {},
        };
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            writable: true,
        });
    });

    it('should draw beji without throwing', () => {
        const beji: Beji[] = [
            {
                id: 'b1',
                playerId: 'p1',
                worldId: 'w1',
                emoji: '😀',
                name: 'Test',
                position: { x: 0, y: 0 },
                target: { x: 10, y: 10 },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();

        expect(() => {
            drawBeji({
                ctx,
                canvas,
                beji,
                physicsPositions,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });

    it('should use physics positions when available', () => {
        const beji: Beji[] = [
            {
                id: 'b1',
                playerId: 'p1',
                worldId: 'w1',
                emoji: '😀',
                name: 'Test',
                position: { x: 0, y: 0 },
                target: { x: 10, y: 10 },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();
        physicsPositions.set('b1', { x: 5, y: 5 });

        expect(() => {
            drawBeji({
                ctx,
                canvas,
                beji,
                physicsPositions,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });

    it('should handle empty beji array', () => {
        const physicsPositions = new Map<string, { x: number; y: number }>();

        expect(() => {
            drawBeji({
                ctx,
                canvas,
                beji: [],
                physicsPositions,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });

    it('should handle multiple bejis', () => {
        const beji: Beji[] = [
            {
                id: 'b1',
                playerId: 'p1',
                worldId: 'w1',
                emoji: '😀',
                name: 'Test1',
                position: { x: 0, y: 0 },
                target: { x: 10, y: 10 },
                walk: true,
                createdAt: Date.now(),
            },
            {
                id: 'b2',
                playerId: 'p2',
                worldId: 'w1',
                emoji: '😁',
                name: 'Test2',
                position: { x: 5, y: 5 },
                target: { x: 15, y: 15 },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();

        expect(() => {
            drawBeji({
                ctx,
                canvas,
                beji,
                physicsPositions,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
                pixelsPerMeter: 100,
            });
        }).not.toThrow();
    });
});

describe('setupCanvas', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const mockCtx = {
            setTransform: () => {},
            clearRect: () => {},
            scale: () => {},
            translate: () => {},
        };
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            writable: true,
        });
    });

    it('should setup canvas without throwing', () => {
        expect(() => {
            setupCanvas({
                canvas,
                ctx,
                viewport: { width: 800, height: 600 },
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });

    it('should handle different viewport sizes', () => {
        expect(() => {
            setupCanvas({
                canvas,
                ctx,
                viewport: { width: 1024, height: 768 },
                renderViewX: -50,
                renderViewY: -50,
                renderViewWidth: 200,
                renderViewHeight: 200,
            });
        }).not.toThrow();
    });

    it('should handle small viewport', () => {
        expect(() => {
            setupCanvas({
                canvas,
                ctx,
                viewport: { width: 100, height: 100 },
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 50,
                renderViewHeight: 50,
            });
        }).not.toThrow();
    });

    it('should handle device pixel ratio', () => {
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 2,
            writable: true,
        });

        expect(() => {
            setupCanvas({
                canvas,
                ctx,
                viewport: { width: 800, height: 600 },
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 100,
                renderViewHeight: 100,
            });
        }).not.toThrow();
    });
});

