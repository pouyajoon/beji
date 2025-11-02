"use client";

import { useAtom, useSetAtom } from "../lib/jotai";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useMessages } from "../i18n/DictionaryProvider";
import {
    bejiAtom,
    playersAtom,
    worldsAtom,
    selectedBejiEmojiAtom,
    bejiNameAtom,
    staticBejiAtom,
    type Player,
    type Beji,
    type StaticBeji,
    type World,
} from "./atoms";
import { generateRandomEmojiSet } from "../app/emoji/random";
import { codepointsToEmoji } from "./emoji";
import { Header } from "./start/Header";
import { EmojiPicker } from "./start/EmojiPicker";
import { BejiNameInput } from "./start/BejiNameInput";
import { StartAction } from "./start/StartAction";
import { SelectedPreview } from "./start/SelectedPreview";
import { createWorld } from "../src/lib/rpc/worldClient";
import type { StaticBeji as ProtoStaticBeji } from "../src/proto/staticbeji/v1/staticbeji_pb";
import type { PlainMessage } from "@bufbuild/protobuf";

// Use shared generateRandomEmojiSet based on Emoji_Presentation allowlist

export function StartPage() {
    const { messages } = useMessages<{ Start: Record<string, string> }>();
    const router = useRouter();
    const [randomGrid, setRandomGrid] = useState<number[][]>([]);
    const [isCreating, setIsCreating] = useState(false);
    useEffect(() => {
        // Generate on client only to avoid SSR/client mismatch
        setRandomGrid(generateRandomEmojiSet(35));
    }, []);
    const [selectedEmoji, setSelectedEmoji] = useAtom(selectedBejiEmojiAtom);
    const [bejiName, setBejiName] = useAtom(bejiNameAtom);

    const setPlayers = useSetAtom(playersAtom);
    const setBeji = useSetAtom(bejiAtom);
    const setStaticBeji = useSetAtom(staticBejiAtom);
    const setWorlds = useSetAtom(worldsAtom);

    const handleStartGame = async (emojiOverride?: number[]) => {
        const effectiveEmoji = emojiOverride ?? selectedEmoji;
        if (!effectiveEmoji || !bejiName.trim() || isCreating) return;

        setIsCreating(true);
        try {
            // Call RPC to create world
            const response = await createWorld(bejiName.trim(), effectiveEmoji);

            if (!response.world) {
                throw new Error("Failed to create world: no world data returned");
            }

            const worldData = response.world;

            // Convert proto types to app types and set state
            const newPlayer: Player = {
                id: worldData.player!.id,
                emoji: worldData.player!.emoji,
                emojiCodepoints: worldData.player!.emojiCodepoints,
                bejiIds: worldData.player!.bejiIds,
                createdAt: Number(worldData.player!.createdAt),
            };

            const newBeji: Beji = {
                id: worldData.beji!.id,
                playerId: worldData.beji!.playerId,
                worldId: worldData.beji!.worldId,
                emoji: worldData.beji!.emoji,
                name: worldData.beji!.name,
                position: worldData.beji!.position ? { x: worldData.beji!.position.x, y: worldData.beji!.position.y } : { x: 0, y: 0 },
                target: worldData.beji!.target ? { x: worldData.beji!.target.x, y: worldData.beji!.target.y } : { x: 0, y: 0 },
                walk: worldData.beji!.walk,
                createdAt: Number(worldData.beji!.createdAt),
            };

            const newWorld: World = {
                id: worldData.world!.id,
                mainBejiId: worldData.world!.mainBejiId,
                staticBejiIds: worldData.world!.staticBejiIds,
                createdAt: Number(worldData.world!.createdAt),
            };

            const staticBejis: StaticBeji[] = worldData.staticBeji.map((sb: PlainMessage<ProtoStaticBeji>) => ({
                id: sb.id,
                worldId: sb.worldId,
                emojiCodepoint: sb.emojiCodepoint,
                emoji: sb.emoji,
                position: sb.position ? { x: sb.position.x, y: sb.position.y } : { x: 0, y: 0 },
                harvested: sb.harvested,
            }));

            // Set all state
            setPlayers([newPlayer]);
            setWorlds([newWorld]);
            setBeji([newBeji]);
            setStaticBeji(staticBejis);

            // Navigate to world page
            router.push(`/world/${newWorld.id}` as Route);
        } catch (error) {
            console.error("Error creating world:", error);
            // TODO: Show error to user
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "clamp(12px, 3vw, 24px)",
            paddingTop: "clamp(60px, 15vw, 80px)",
            paddingBottom: "clamp(12px, 3vw, 24px)",
            paddingLeft: "clamp(12px, 3vw, 24px)",
            paddingRight: "clamp(12px, 3vw, 24px)",
            overflowX: "hidden",
            overflowY: "auto",
            boxSizing: "border-box",
        }}>
            <div style={{
                background: "transparent",
                borderRadius: "clamp(12px, 3vw, 16px)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--muted)",
                padding: "clamp(16px, 4vw, 32px)",
                maxWidth: 480,
                width: "100%",
                margin: "auto 0",
                boxSizing: "border-box",
                minHeight: 0,
                outline: "none",
                WebkitTransform: "translateZ(0)",
                transform: "translateZ(0)",
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
                    label={isCreating ? (messages.Start?.creating ?? "Creating...") : (messages.Start?.startButton ?? "Start Adventure! 🚀")}
                    href="/emoji"
                    disabled={!selectedEmoji || !bejiName.trim() || isCreating}
                    onActivate={handleStartGame}
                />

                <SelectedPreview emoji={selectedEmoji} name={bejiName} />
            </div>
        </div >
    );
}

