"use client";

import { useEffect } from "react";

import { registerShortcut, unregisterShortcutById, RESERVED_KEYS } from "../../src/lib/shortcuts";
import { Tooltip } from "../Tooltip";

type ToggleFollowMouseActionProps = {
    followMouse: boolean;
    onToggle: (value: boolean) => void;
};

export function ToggleFollowMouseAction({ followMouse, onToggle }: ToggleFollowMouseActionProps) {
    // Register keyboard shortcut
    useEffect(() => {
        // Avoid using reserved arrow keys
        if (RESERVED_KEYS.has("f")) return;
        registerShortcut({
            id: "toggle-follow-mouse",
            key: "f",
            description: "Toggle follow mouse",
            preventDefault: true,
            handler: () => onToggle(!followMouse),
        });
        return () => unregisterShortcutById("toggle-follow-mouse");
    }, [followMouse, onToggle]);

    const tooltipLabel = (followMouse ? "Following mouse (click to stop)" : "Not following mouse (click to enable)") + " • Shortcut: F";

    return (
        <Tooltip label={tooltipLabel}>
            <button
                type="button"
                aria-pressed={followMouse}
                aria-label={tooltipLabel}
                onClick={() => onToggle(!followMouse)}
                style={{
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: followMouse ? "1px solid #10b981" : "1px solid #d1d5db",
                    background: followMouse ? "#ecfdf5" : "#ffffff",
                    color: "#0f172a",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                }}
            >
                🦶
            </button>
        </Tooltip>
    );
}

