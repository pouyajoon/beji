/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Map } from '../components/Map';
import JotaiProvider from '../components/JotaiProvider';
import React from 'react';

describe('CanvasMap - Initialization Order', () => {
    beforeEach(() => {
        // Mock devicePixelRatio
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            writable: true,
        });
        
        // Mock ResizeObserver
        global.ResizeObserver = class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
        
        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
            setTimeout(() => cb(performance.now()), 16);
            return 1;
        });
        global.cancelAnimationFrame = vi.fn(() => {});
        
        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn(() => ({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        });
    });

    it('should not throw ReferenceError during SSR when accessing refs', () => {
        // This test checks for "Cannot access X before initialization" errors
        // which occur when refs are accessed in useMemo/hooks before they are declared
        // SSR rendering will surface initialization order issues
        
        expect(() => {
            const html = renderToString(
                React.createElement(JotaiProvider, {},
                    React.createElement(Map)
                )
            );
        }).not.toThrow(ReferenceError);
    });

    it('should handle component instantiation without initialization errors', () => {
        // This test ensures the component can be instantiated without errors
        // even with empty/default state
        
        let error: Error | null = null;
        try {
            const html = renderToString(
                React.createElement(JotaiProvider, {},
                    React.createElement(Map)
                )
            );
        } catch (e) {
            error = e as Error;
        }
        
        // Should not throw ReferenceError about accessing refs before initialization
        expect(error).not.toBeInstanceOf(ReferenceError);
        if (error && error.message.includes('before initialization')) {
            throw new Error(`Ref initialization order issue detected: ${error.message}`);
        }
        
        // Component should render successfully
        expect(error).toBeNull();
    });

    it('should initialize all refs before they are accessed in hooks', () => {
        // This test ensures refs are declared in the correct order
        // The "before initialization" error occurs when:
        // - A useMemo/hook tries to access a ref before it's declared
        // - The ref is used in a dependency or directly accessed
        
        let threwReferenceError = false;
        let errorMessage = '';
        
        try {
            const html = renderToString(
                React.createElement(JotaiProvider, {},
                    React.createElement(Map)
                )
            );
        } catch (e) {
            const error = e as Error;
            if (error instanceof ReferenceError) {
                threwReferenceError = true;
                errorMessage = error.message;
            }
        }
        
        // Should not throw ReferenceError about accessing refs before initialization
        if (threwReferenceError && errorMessage.includes('before initialization')) {
            throw new Error(
                `Ref initialization order issue detected!\n` +
                `Error: ${errorMessage}\n` +
                `This usually means a ref is being accessed in useMemo/useEffect before it's declared.\n` +
                `Check that all refs are declared before any hooks that use them.`
            );
        }
        
        expect(threwReferenceError).toBe(false);
    });
});

