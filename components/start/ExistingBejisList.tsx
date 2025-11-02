"use client";

import React from "react";
import type { Route } from "next";
import type { Beji, World } from "../atoms";
import { useMessages } from "../../i18n/DictionaryProvider";

interface ExistingBejisListProps {
    bejis: Array<Beji & { world?: World | null }>;
    onCreateNew?: () => void;
}

export function ExistingBejisList({ bejis, onCreateNew }: ExistingBejisListProps) {
    const { messages } = useMessages<{ Start: Record<string, string> }>();

    return (
        <>
            <style jsx>{`
                .existing-bejis-item {
                    --border-color: #e5e5e5;
                    --text-color: #000000;
                    --hover-bg: #f5f5f5;
                }
                @media (prefers-color-scheme: dark) {
                    .existing-bejis-item {
                        --border-color: #333333;
                        --text-color: #ffffff;
                        --hover-bg: #2a2a2a;
                    }
                }
            `}</style>
            <div style={{ marginBottom: "24px" }}>
                <h3 style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    marginBottom: "12px",
                    color: "var(--text-color)",
                }}>
                    {messages.Start?.existingBejisLabel ?? "Your Bejis"}
                </h3>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                }}>
                    {bejis.length > 0 && onCreateNew && (
                        <button
                            type="button"
                            onClick={onCreateNew}
                            className="existing-bejis-item"
                            style={{
                                padding: "12px 16px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-color)",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                textAlign: "left",
                                transition: "background 0.2s ease",
                                color: "var(--text-color)",
                                fontFamily: "inherit",
                                fontSize: "inherit",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            <span style={{ fontSize: "24px" }}>➕</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "500" }}>
                                    {messages.Start?.createNewBejiLabel ?? "Create a new beji"}
                                </div>
                            </div>
                        </button>
                    )}
                    {bejis.map((beji) => {
                        if (!beji.worldId) {
                            return null;
                        }
                        return (
                            <a
                                key={beji.id}
                                href={`/world/${beji.worldId}` as Route}
                                className="existing-bejis-item"
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border-color)",
                                    background: "transparent",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    textAlign: "left",
                                    transition: "background 0.2s ease",
                                    color: "var(--text-color)",
                                    textDecoration: "none",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                <span style={{ fontSize: "24px" }}>{beji.emoji}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: "500", marginBottom: "2px" }}>
                                        {beji.name}
                                    </div>
                                    <div style={{ fontSize: "12px", opacity: 0.7 }}>
                                        {messages.Start?.joinWorldLabel ?? "Join world"}
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

