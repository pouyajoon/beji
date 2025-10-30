"use client";

import { useAtom, useSetAtom } from "../lib/jotai";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMessages } from "../i18n/DictionaryProvider";
import { bejiAtom, playersAtom, selectedBejiEmojiAtom, bejiNameAtom, type Player, type Beji } from "./atoms";
import { generateRandomEmojiSet } from "../app/emoji/random";
import { codepointsToEmoji } from "./emoji";
import { Header } from "./start/Header";
import { EmojiPicker } from "./start/EmojiPicker";
import { BejiNameInput } from "./start/BejiNameInput";
import { StartAction } from "./start/StartAction";
import { SelectedPreview } from "./start/SelectedPreview";
import { MAP_SIZE } from "../lib/constants";

// Use shared generateRandomEmojiSet based on Emoji_Presentation allowlist

export function StartPage() {
    const { messages } = useMessages<{ Start: Record<string, string> }>();
    const router = useRouter();
    const [randomGrid, setRandomGrid] = useState<number[][]>([]);
    useEffect(() => {
        // Generate on client only to avoid SSR/client mismatch
        setRandomGrid(generateRandomEmojiSet(35));
    }, []);
    const [selectedEmoji, setSelectedEmoji] = useAtom(selectedBejiEmojiAtom);
    const [bejiName, setBejiName] = useAtom(bejiNameAtom);

    const setPlayers = useSetAtom(playersAtom);
    const setBeji = useSetAtom(bejiAtom);

    const handleStartGame = (emojiOverride?: number[]) => {
        const effectiveEmoji = emojiOverride ?? selectedEmoji;
        if (!effectiveEmoji || !bejiName.trim()) return;

        const emojiChar = codepointsToEmoji(effectiveEmoji);
        const playerId = `player-${Date.now()}`;

        // Create new player
        const newPlayer: Player = {
            id: playerId,
            emoji: emojiChar,
            emojiCodepoints: effectiveEmoji,
        };

        setPlayers([newPlayer]);

        // Load last saved position if available
        let startX = MAP_SIZE / 2;
        let startY = MAP_SIZE / 2;
        if (typeof window !== "undefined") {
            try {
                const raw = window.localStorage.getItem("beji:lastPosition");
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
                        // Clamp to map bounds (0..MAP_SIZE) to be safe
                        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
                        startX = clamp(parsed.x, 0, MAP_SIZE);
                        startY = clamp(parsed.y, 0, MAP_SIZE);
                    }
                }
            } catch { }
        }

        // Add initial beji for the player
        const newBeji: Beji = {
            id: `beji-${Date.now()}`,
            playerId: playerId,
            emoji: emojiChar,
            name: bejiName.trim(),
            x: startX,
            y: startY,
            targetX: startX,
            targetY: startY,
            walk: true,
        };

        setBeji([newBeji]);
        router.push("/emoji");
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
                <Header
                    title={"Beji  🎮"}
                    subtitle={messages.Start?.subtitle ?? "Choose your emoji and give it a name to start your adventure!"}
                />

                <EmojiPicker
                    label={messages.Start?.chooseEmojiLabel ?? "Choose Your Emoji"}
                    emojiGrid={randomGrid}
                    selectedEmoji={selectedEmoji}
                    onSelect={(cps) => {
                        setSelectedEmoji(cps);
                        if (bejiName.trim()) {
                            handleStartGame(cps);
                        }
                    }}
                />

                <BejiNameInput
                    label={messages.Start?.nameLabel ?? "Give Your Beji a Name"}
                    placeholder={messages.Start?.namePlaceholder ?? "e.g. Beji the Brave"}
                    value={bejiName}
                    onChange={setBejiName}
                    onEnter={() => {
                        if (bejiName.trim() && selectedEmoji) {
                            handleStartGame();
                        }
                    }}
                />

                <StartAction
                    label={messages.Start?.startButton ?? "Start Adventure! 🚀"}
                    href="/emoji"
                    disabled={!selectedEmoji || !bejiName.trim()}
                    onActivate={handleStartGame}
                />

                <SelectedPreview emoji={selectedEmoji} name={bejiName} />
            </div>
        </div >
    );
}

