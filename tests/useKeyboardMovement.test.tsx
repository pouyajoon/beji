/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardMovement } from '../hooks/useKeyboardMovement';

describe('useKeyboardMovement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should call onStep with correct dx/dy for ArrowUp', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        window.dispatchEvent(event);

        expect(onStep).toHaveBeenCalledOnce();
        expect(onStep).toHaveBeenCalledWith(0, -40, expect.any(KeyboardEvent));
    });

    it('should call onStep with correct dx/dy for ArrowDown', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        window.dispatchEvent(event);

        expect(onStep).toHaveBeenCalledOnce();
        expect(onStep).toHaveBeenCalledWith(0, 40, expect.any(KeyboardEvent));
    });

    it('should call onStep with correct dx/dy for ArrowLeft', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        window.dispatchEvent(event);

        expect(onStep).toHaveBeenCalledOnce();
        expect(onStep).toHaveBeenCalledWith(-40, 0, expect.any(KeyboardEvent));
    });

    it('should call onStep with correct dx/dy for ArrowRight', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        window.dispatchEvent(event);

        expect(onStep).toHaveBeenCalledOnce();
        expect(onStep).toHaveBeenCalledWith(40, 0, expect.any(KeyboardEvent));
    });

    it('should not call onStep for non-arrow keys', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        const event = new KeyboardEvent('keydown', { key: 'a' });
        window.dispatchEvent(event);

        expect(onStep).not.toHaveBeenCalled();
    });

    it('should not call onStep when disabled', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: false, stepSize: 40 }));

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        window.dispatchEvent(event);

        expect(onStep).not.toHaveBeenCalled();
    });

    it('should use default stepSize when not provided', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep));

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        window.dispatchEvent(event);

        expect(onStep).toHaveBeenCalledOnce();
        expect(onStep).toHaveBeenCalledWith(0, -40, expect.any(KeyboardEvent));
    });

    it('should use custom stepSize', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 100 }));

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        window.dispatchEvent(event);

        expect(onStep).toHaveBeenCalledOnce();
        expect(onStep).toHaveBeenCalledWith(0, -100, expect.any(KeyboardEvent));
    });

    it('should call preventDefault on arrow key events', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
        window.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalledOnce();
    });

    it('should handle multiple key presses', () => {
        const onStep = vi.fn();
        renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        expect(onStep).toHaveBeenCalledTimes(4);
        expect(onStep).toHaveBeenNthCalledWith(1, 0, -40, expect.any(KeyboardEvent));
        expect(onStep).toHaveBeenNthCalledWith(2, 40, 0, expect.any(KeyboardEvent));
        expect(onStep).toHaveBeenNthCalledWith(3, 0, 40, expect.any(KeyboardEvent));
        expect(onStep).toHaveBeenNthCalledWith(4, -40, 0, expect.any(KeyboardEvent));
    });

    it('should cleanup event listener on unmount', () => {
        const onStep = vi.fn();
        const { unmount } = renderHook(() => useKeyboardMovement(onStep, { enabled: true, stepSize: 40 }));

        unmount();

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        window.dispatchEvent(event);

        expect(onStep).not.toHaveBeenCalled();
    });
});

