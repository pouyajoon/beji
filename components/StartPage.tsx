"use client";

import { useAtom, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useMessages } from "../i18n/DictionaryProvider";
import { currentPlayerIdAtom, bejiAtom, playersAtom, selectedBejiEmojiAtom, bejiNameAtom, type Player, type Beji } from "./atoms";
import { generateRandomEmojiSet } from "../app/emoji/random";

// Use shared generateRandomEmojiSet based on Emoji_Presentation allowlist

function codepointsToEmoji(cps: number[]): string {
    return String.fromCodePoint(...cps);
}

export function StartPage() {
    const { messages } = useMessages<{ Start: Record<string, string> }>();
    const [randomGrid, setRandomGrid] = useState<number[][]>([]);
    useEffect(() => {
        // Generate on client only to avoid SSR/client mismatch
        setRandomGrid(generateRandomEmojiSet(30));
    }, []);
    const [selectedEmoji, setSelectedEmoji] = useAtom(selectedBejiEmojiAtom);
    const [bejiName, setBejiName] = useAtom(bejiNameAtom);

    const setCurrentPlayerId = useSetAtom(currentPlayerIdAtom);
    const setPlayers = useSetAtom(playersAtom);
    const setBeji = useSetAtom(bejiAtom);

    const handleStartGame = () => {
        if (!selectedEmoji || !bejiName.trim()) return;

        const emojiChar = codepointsToEmoji(selectedEmoji);
        const playerId = `player-${Date.now()}`;

        // Create new player
        const newPlayer: Player = {
            id: playerId,
            emoji: emojiChar,
            emojiCodepoints: selectedEmoji,
        };

        setPlayers([newPlayer]);
        setCurrentPlayerId(playerId);

        // Add initial beji for the player
        const newBeji: Beji = {
            id: `beji-${Date.now()}`,
            playerId: playerId,
            emoji: emojiChar,
            name: bejiName.trim(),
            x: 400,
            y: 400,
            targetX: 400,
            targetY: 400,
        };

        setBeji([newBeji]);

        // Navigation is handled by the anchor element's href
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            overflowX: "hidden",
        }}>
            <div style={{
                background: "transparent",
                borderRadius: 16,
                border: "1px solid var(--muted)",
                padding: 32,
                maxWidth: 480,
                width: "100%",
            }}>
                <h1 style={{
                    fontSize: 48,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: 'var(--fg)',
                    textAlign: "center",
                }}>
                    Beji  🎮
                </h1>
                <p style={{
                    fontSize: 16,
                    color: "var(--muted)",
                    textAlign: "center",
                    marginBottom: 32,
                }}>
                    {messages.Start?.subtitle ?? "Choose your emoji and give it a name to start your adventure!"}
                </p>

                <div style={{ marginBottom: 24 }}>
                    <label style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--fg)",
                        marginBottom: 8,
                    }}>
                        {messages.Start?.chooseEmojiLabel ?? "Choose Your Emoji"}
                    </label>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(64px, 64px))",
                        gridAutoRows: "64px",
                        // gap: 8,
                        // padding: 16,
                        background: "transparent",
                        // borderRadius: 8,
                        border: "1px solid var(--muted)",
                        // maxHeight: 280,
                        overflowY: "auto",
                        justifyContent: "center",
                    }}>
                        {randomGrid.map((cps, idx) => {
                            const isSelected =
                                Array.isArray(selectedEmoji) &&
                                selectedEmoji.length === cps.length &&
                                cps.every((v, i) => v === selectedEmoji[i]);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedEmoji(cps)}
                                    style={{
                                        // padding: 8,
                                        width: 64,
                                        height: 64,
                                        border: isSelected ? "2px solid var(--fg)" : "2px solid transparent",
                                        background: "transparent",
                                        cursor: "pointer",
                                        fontSize: 32,
                                        borderRadius: 8,
                                        // transition: "all 0.2s",
                                    }}
                                    aria-pressed={isSelected}
                                    onMouseEnter={(e) => {
                                        // Keep minimalist hover: no change for unselected
                                    }}
                                    onMouseLeave={(e) => {
                                        // No-op
                                    }}
                                >
                                    {codepointsToEmoji(cps)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                    <label style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--fg)",
                        marginBottom: 8,
                    }}>
                        {messages.Start?.nameLabel ?? "Give Your Beji a Name"}
                    </label>
                    <input
                        type="text"
                        value={bejiName}
                        onChange={(e) => setBejiName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && bejiName.trim() && selectedEmoji) {
                                handleStartGame();
                            }
                        }}
                        placeholder={messages.Start?.namePlaceholder ?? "e.g. Beji the Brave"}
                        style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "12px 16px",
                            border: "1px solid var(--muted)",
                            borderRadius: 8,
                            fontSize: 16,
                            outline: "none",
                            background: "transparent",
                            color: "var(--fg)",
                        }}
                        onFocus={() => { }}
                        onBlur={() => { }}
                    />
                </div>

                <a
                    href="/emoji"
                    onClick={(e) => {
                        if (!selectedEmoji || !bejiName.trim()) {
                            e.preventDefault();
                            return;
                        }
                        handleStartGame();
                    }}
                    aria-disabled={!selectedEmoji || !bejiName.trim()}
                    role="button"
                    style={{
                        display: "inline-block",
                        textAlign: "center",
                        textDecoration: "none",
                        width: "100%",
                        padding: "16px",
                        border: !selectedEmoji || !bejiName.trim() ? "1px solid var(--muted)" : "1px solid var(--fg)",
                        borderRadius: 8,
                        fontSize: 18,
                        fontWeight: 600,
                        color: !selectedEmoji || !bejiName.trim() ? "var(--muted)" : "var(--fg)",
                        background: "transparent",
                        cursor: selectedEmoji && bejiName.trim() ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                    }}
                >
                    {messages.Start?.startButton ?? "Start Adventure! 🚀"}
                </a>

                {selectedEmoji && (
                    <div style={{
                        marginTop: 24,
                        padding: 16,
                        background: "transparent",
                        border: "1px solid var(--muted)",
                        borderRadius: 8,
                        textAlign: "center",
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>
                            {codepointsToEmoji(selectedEmoji)}
                        </div>
                        {bejiName && (
                            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>
                                {bejiName}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}

