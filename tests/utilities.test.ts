/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

import { codepointsToEmoji } from '../components/emoji';
import { getTouchDistance, getTouchCenter } from '../components/map/touchUtils';

describe('touchUtils', () => {
    describe('getTouchDistance', () => {
        it('should calculate distance between two touch points', () => {
            const touch1 = { clientX: 0, clientY: 0 };
            const touch2 = { clientX: 3, clientY: 4 };
            const distance = getTouchDistance(touch1, touch2);
            expect(distance).toBe(5); // 3-4-5 triangle
        });

        it('should return 0 for same touch points', () => {
            const touch1 = { clientX: 10, clientY: 20 };
            const touch2 = { clientX: 10, clientY: 20 };
            const distance = getTouchDistance(touch1, touch2);
            expect(distance).toBe(0);
        });

        it('should handle negative coordinates', () => {
            const touch1 = { clientX: -5, clientY: -5 };
            const touch2 = { clientX: 0, clientY: 0 };
            const distance = getTouchDistance(touch1, touch2);
            expect(distance).toBeCloseTo(Math.sqrt(50), 5);
        });

        it('should handle vertical distance', () => {
            const touch1 = { clientX: 100, clientY: 0 };
            const touch2 = { clientX: 100, clientY: 50 };
            const distance = getTouchDistance(touch1, touch2);
            expect(distance).toBe(50);
        });

        it('should handle horizontal distance', () => {
            const touch1 = { clientX: 0, clientY: 100 };
            const touch2 = { clientX: 50, clientY: 100 };
            const distance = getTouchDistance(touch1, touch2);
            expect(distance).toBe(50);
        });
    });

    describe('getTouchCenter', () => {
        it('should calculate center point between two touch points', () => {
            const touch1 = { clientX: 0, clientY: 0 };
            const touch2 = { clientX: 10, clientY: 20 };
            const center = getTouchCenter(touch1, touch2);
            expect(center.x).toBe(5);
            expect(center.y).toBe(10);
        });

        it('should return same point for identical touch points', () => {
            const touch1 = { clientX: 100, clientY: 50 };
            const touch2 = { clientX: 100, clientY: 50 };
            const center = getTouchCenter(touch1, touch2);
            expect(center.x).toBe(100);
            expect(center.y).toBe(50);
        });

        it('should handle negative coordinates', () => {
            const touch1 = { clientX: -10, clientY: -20 };
            const touch2 = { clientX: 10, clientY: 20 };
            const center = getTouchCenter(touch1, touch2);
            expect(center.x).toBe(0);
            expect(center.y).toBe(0);
        });

        it('should handle decimal coordinates', () => {
            const touch1 = { clientX: 5.5, clientY: 7.5 };
            const touch2 = { clientX: 10.5, clientY: 12.5 };
            const center = getTouchCenter(touch1, touch2);
            expect(center.x).toBe(8);
            expect(center.y).toBe(10);
        });
    });
});

describe('emoji', () => {
    describe('codepointsToEmoji', () => {
        it('should convert code points to emoji', () => {
            const codePoints = [0x1f600];
            const emoji = codepointsToEmoji(codePoints);
            expect(emoji).toBe('😀');
        });

        it('should handle multiple code points', () => {
            const codePoints = [0x1f1fa, 0x1f1f8];
            const emoji = codepointsToEmoji(codePoints);
            expect(emoji).toBe('🇺🇸');
        });

        it('should handle single code point as array', () => {
            const codePoints = [0x2764];
            const emoji = codepointsToEmoji(codePoints);
            expect(emoji).toBe('❤');
        });

        it('should handle empty array', () => {
            const codePoints: number[] = [];
            const emoji = codepointsToEmoji(codePoints);
            expect(emoji).toBe('');
        });

        it('should handle complex emoji with modifiers', () => {
            const codePoints = [0x1f469, 0x1f3fb];
            const emoji = codepointsToEmoji(codePoints);
            expect(emoji).toBe('👩🏻');
        });
    });
});

