"use client";

import { useEffect } from "react";

type UseKeyboardMovementOptions = {
    enabled?: boolean;
    stepSize?: number;
};

export function useKeyboardMovement(
    onStep: (dx: number, dy: number, event: KeyboardEvent) => void,
    options: UseKeyboardMovementOptions = {}
) {
    const { enabled = true, stepSize = 40 } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            let dx = 0;
            let dy = 0;

            switch (e.key) {
                case "ArrowUp":
                    dy = -stepSize;
                    break;
                case "ArrowDown":
                    dy = stepSize;
                    break;
                case "ArrowLeft":
                    dx = -stepSize;
                    break;
                case "ArrowRight":
                    dx = stepSize;
                    break;
                default:
                    return;
            }

            if (dx !== 0 || dy !== 0) {
                e.preventDefault();
                onStep(dx, dy, e);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enabled, stepSize, onStep]);
}


