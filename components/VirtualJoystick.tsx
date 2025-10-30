"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
    onVector: (vx: number, vy: number) => void;
};

export function VirtualJoystick({ onVector }: Props) {
    const radius = 48;
    const knobRadius = 20;
    const [active, setActive] = useState(false);
    const [vec, setVec] = useState({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);
    const lastEmitRef = useRef<number>(0);

    const emit = (t: number) => {
        // Throttle to ~90ms
        if (t - lastEmitRef.current > 90) {
            lastEmitRef.current = t;
            const len = Math.hypot(vec.x, vec.y);
            const vx = len > 0 ? vec.x / len : 0;
            const vy = len > 0 ? vec.y / len : 0;
            onVector(vx, vy);
        }
        rafRef.current = requestAnimationFrame(emit);
    };

    useEffect(() => {
        if (active && rafRef.current == null) {
            rafRef.current = requestAnimationFrame(emit);
        }
        if (!active && rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, vec.x, vec.y]);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const start = (clientX: number, clientY: number) => {
        setActive(true);
        move(clientX, clientY);
    };
    const move = (clientX: number, clientY: number) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let x = clientX - cx;
        let y = clientY - cy;
        const len = Math.hypot(x, y);
        if (len > radius) {
            x = (x / len) * radius;
            y = (y / len) * radius;
        }
        setVec({ x, y });
    };
    const end = () => {
        setActive(false);
        setVec({ x: 0, y: 0 });
    };

    return (
        <div
            style={{
                position: "fixed",
                left: 16,
                bottom: 16,
                width: radius * 2 + 12,
                height: radius * 2 + 12,
                touchAction: "none",
                zIndex: 20,
            }}
        >
            <div
                ref={containerRef}
                onTouchStart={(e) => start(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={end}
                onPointerDown={(e) => {
                    if ((e as PointerEvent).pointerType === "touch") {
                        start(e.clientX, e.clientY);
                    }
                }}
                onPointerMove={(e) => {
                    if ((e as PointerEvent).pointerType === "touch" && active) {
                        move(e.clientX, e.clientY);
                    }
                }}
                onPointerUp={end}
                style={{
                    width: radius * 2,
                    height: radius * 2,
                    borderRadius: radius,
                    border: "2px solid #e5e7eb",
                    background: "rgba(249, 250, 251, 0.6)",
                    position: "relative",
                    backdropFilter: "blur(4px)",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: radius + vec.x - knobRadius,
                        top: radius + vec.y - knobRadius,
                        width: knobRadius * 2,
                        height: knobRadius * 2,
                        borderRadius: knobRadius,
                        background: "#3b82f6",
                        opacity: 0.9,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        transition: active ? "none" : "transform 0.08s ease",
                    }}
                />
            </div>
        </div>
    );
}


