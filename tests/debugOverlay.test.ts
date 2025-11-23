/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';

import type { Beji } from '../components/atoms';
import { drawDebugOverlay } from '../components/map/drawing/debugOverlay';

describe('drawDebugOverlay', () => {
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
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            beginPath: () => {},
            rect: () => {},
            fill: () => {},
            stroke: () => {},
            textAlign: 'left' as CanvasTextAlign,
            textBaseline: 'top' as CanvasTextBaseline,
            fillText: () => {},
            measureText: (text: string) => ({ width: text.length * 10 }),
        };
        // Mock getContext to return our mock
        canvas.getContext = () => mockCtx as any;
        ctx = canvas.getContext('2d')!;
        // Mock devicePixelRatio
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            writable: true,
        });
    });

    it('should handle beji with complete position and target data', () => {
        const beji: Beji[] = [
            {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test',
                position: { x: 10, y: 20 },
                target: { x: 15, y: 25 },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();
        physicsPositions.set('beji1', { x: 12, y: 22 });

        expect(() => {
            drawDebugOverlay({
                ctx,
                canvas,
                mouseWorld: { x: 5, y: 10 },
                beji,
                physicsPositions,
                pixelsPerMeter: 100,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 10,
                renderViewHeight: 10,
                followMouse: true,
            });
        }).not.toThrow();
    });

    it('should handle beji with undefined position', () => {
        const beji: Beji[] = [
            {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test',
                position: { x: undefined as any, y: undefined as any },
                target: { x: 15, y: 25 },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();

        expect(() => {
            drawDebugOverlay({
                ctx,
                canvas,
                mouseWorld: null,
                beji,
                physicsPositions,
                pixelsPerMeter: 100,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 10,
                renderViewHeight: 10,
                followMouse: false,
            });
        }).not.toThrow();
    });

    it('should handle beji with undefined target', () => {
        const beji: Beji[] = [
            {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test',
                position: { x: 10, y: 20 },
                target: undefined as any,
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();

        expect(() => {
            drawDebugOverlay({
                ctx,
                canvas,
                mouseWorld: null,
                beji,
                physicsPositions,
                pixelsPerMeter: 100,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 10,
                renderViewHeight: 10,
                followMouse: false,
            });
        }).not.toThrow();
    });

    it('should handle beji with undefined target.x and target.y', () => {
        const beji: Beji[] = [
            {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test',
                position: { x: 10, y: 20 },
                target: { x: undefined as any, y: undefined as any },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();

        expect(() => {
            drawDebugOverlay({
                ctx,
                canvas,
                mouseWorld: null,
                beji,
                physicsPositions,
                pixelsPerMeter: 100,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 10,
                renderViewHeight: 10,
                followMouse: false,
            });
        }).not.toThrow();
    });

    it('should handle physicsPositions with undefined x or y', () => {
        const beji: Beji[] = [
            {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Test',
                position: { x: 10, y: 20 },
                target: { x: 15, y: 25 },
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();
        physicsPositions.set('beji1', { x: undefined as any, y: 22 });

        expect(() => {
            drawDebugOverlay({
                ctx,
                canvas,
                mouseWorld: null,
                beji,
                physicsPositions,
                pixelsPerMeter: 100,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 10,
                renderViewHeight: 10,
                followMouse: false,
            });
        }).not.toThrow();
    });

    it('should handle empty beji array', () => {
        expect(() => {
            drawDebugOverlay({
                ctx,
                canvas,
                mouseWorld: null,
                beji: [],
                physicsPositions: new Map(),
                pixelsPerMeter: 100,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 10,
                renderViewHeight: 10,
                followMouse: false,
            });
        }).not.toThrow();
    });

    it('should handle multiple beji with mixed valid and invalid data', () => {
        const beji: Beji[] = [
            {
                id: 'beji1',
                playerId: 'player1',
                worldId: 'world1',
                emoji: '😀',
                name: 'Valid',
                position: { x: 10, y: 20 },
                target: { x: 15, y: 25 },
                walk: true,
                createdAt: Date.now(),
            },
            {
                id: 'beji2',
                playerId: 'player2',
                worldId: 'world1',
                emoji: '😁',
                name: 'Invalid',
                position: { x: undefined as any, y: undefined as any },
                target: undefined as any,
                walk: true,
                createdAt: Date.now(),
            },
        ];

        const physicsPositions = new Map<string, { x: number; y: number }>();

        expect(() => {
            drawDebugOverlay({
                ctx,
                canvas,
                mouseWorld: { x: 5, y: 10 },
                beji,
                physicsPositions,
                pixelsPerMeter: 100,
                renderViewX: 0,
                renderViewY: 0,
                renderViewWidth: 10,
                renderViewHeight: 10,
                followMouse: true,
            });
        }).not.toThrow();
    });
});

