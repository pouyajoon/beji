"use client";

import { useAtomValue } from "../../lib/jotai";
import { playersAtom, inventoryAtom } from "../atoms";
import { codepointsToEmoji } from "../emoji";

export function InventoryDisplay() {
    const players = useAtomValue(playersAtom);
    const currentPlayerId = players[0]?.id ?? "";
    // Get per-player inventory, fallback to empty object
    const fullInventory = useAtomValue(inventoryAtom);
    const inventory = currentPlayerId ? (fullInventory[currentPlayerId] || {}) : {};
    
    const entries = Object.entries(inventory)
        .map(([codepoint, count]) => ({
            codepoint: parseInt(codepoint, 10),
            count: count as number,
        }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => a.codepoint - b.codepoint);

    if (entries.length === 0) {
        return null;
    }

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 8px",
            background: "#f9fafb",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
        }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Inventory:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {entries.map((entry) => (
                    <div
                        key={entry.codepoint}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 6px",
                            background: "#ffffff",
                            borderRadius: 4,
                            border: "1px solid #d1d5db",
                        }}
                        title={`Unicode: ${entry.codepoint.toString(16)}`}
                    >
                        <span style={{ fontSize: 16 }}>{codepointsToEmoji([entry.codepoint])}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>×{entry.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

