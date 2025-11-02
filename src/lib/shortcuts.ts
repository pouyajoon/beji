"use client";

import { useEffect, useRef } from "react";

type ShortcutActionId = string;

type Shortcut = {
    id: ShortcutActionId;
    key: string; // e.key normalized lowercase (e.g., 'f', 'z')
    description?: string;
    handler: (event: KeyboardEvent) => void;
    when?: () => boolean; // optional guard
    preventDefault?: boolean;
};

// Global registry to avoid duplicate bindings across components
const registeredByKey: Map<string, Shortcut> = new Map();

export function registerShortcut(shortcut: Shortcut) {
    const key = shortcut.key.toLowerCase();
    if (registeredByKey.has(key)) {
        const existing = registeredByKey.get(key)!;
        if (existing.id !== shortcut.id) {
            // Avoid clobber: keep first registration
            if (typeof console !== "undefined") {
                console.warn(`[shortcuts] Key '${key}' already registered by '${existing.id}', skipping '${shortcut.id}'.`);
            }
            return;
        }
    }
    registeredByKey.set(key, { ...shortcut, key });
}

export function unregisterShortcutById(id: ShortcutActionId) {
    for (const [key, sc] of Array.from(registeredByKey.entries())) {
        if (sc.id === id) registeredByKey.delete(key);
    }
}

export function useShortcuts() {
    const handlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

    useEffect(() => {
        handlerRef.current = (e: KeyboardEvent) => {
            const key = (e.key || "").toLowerCase();
            // Ignore if typing in inputs/textareas
            const target = e.target as HTMLElement | null;
            const tag = (target?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

            const sc = registeredByKey.get(key);
            if (!sc) return;
            if (sc.when && !sc.when()) return;
            if (sc.preventDefault) e.preventDefault();
            sc.handler(e);
        };

        const fn = (e: KeyboardEvent) => handlerRef.current?.(e);
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, []);
}

// Reserved keys used elsewhere (for visibility and conflict checks)
export const RESERVED_KEYS = new Set<string>([
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
]);


