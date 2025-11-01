"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Map } from "../../../components/Map";
import { getWorld } from "../../../src/lib/rpc/worldClient";
import { useSetAtom } from "../../../lib/jotai";
import {
    playersAtom,
    bejiAtom,
    staticBejiAtom,
    worldsAtom,
    type Player,
    type Beji,
    type StaticBeji,
    type World,
} from "../../../components/atoms";

export default function WorldPage() {
    const params = useParams();
    const worldId = params.id as string;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const setPlayers = useSetAtom(playersAtom);
    const setBeji = useSetAtom(bejiAtom);
    const setStaticBeji = useSetAtom(staticBejiAtom);
    const setWorlds = useSetAtom(worldsAtom);

    useEffect(() => {
        if (!worldId) return;

        async function loadWorld() {
            try {
                setLoading(true);
                setError(null);

                const response = await getWorld(worldId);

                if (!response.world) {
                    throw new Error("World not found");
                }

                const worldData = response.world;

                // Convert proto types to app types and set state
                const player: Player = {
                    id: worldData.player!.id,
                    emoji: worldData.player!.emoji,
                    emojiCodepoints: worldData.player!.emojiCodepoints,
                    bejiIds: worldData.player!.bejiIds,
                    createdAt: worldData.player!.createdAt,
                };

                const beji: Beji = {
                    id: worldData.beji!.id,
                    playerId: worldData.beji!.playerId,
                    worldId: worldData.beji!.worldId,
                    emoji: worldData.beji!.emoji,
                    name: worldData.beji!.name,
                    position: worldData.beji!.position
                        ? { x: worldData.beji!.position.x, y: worldData.beji!.position.y }
                        : { x: 0, y: 0 },
                    target: worldData.beji!.target
                        ? { x: worldData.beji!.target.x, y: worldData.beji!.target.y }
                        : { x: 0, y: 0 },
                    walk: worldData.beji!.walk,
                    createdAt: worldData.beji!.createdAt,
                };

                const world: World = {
                    id: worldData.world!.id,
                    mainBejiId: worldData.world!.mainBejiId,
                    staticBejiIds: worldData.world!.staticBejiIds,
                    createdAt: worldData.world!.createdAt,
                };

                const staticBeji: StaticBeji[] = worldData.staticBeji.map((sb) => ({
                    id: sb.id,
                    worldId: sb.worldId,
                    emojiCodepoint: sb.emojiCodepoint,
                    emoji: sb.emoji,
                    position: sb.position ? { x: sb.position.x, y: sb.position.y } : { x: 0, y: 0 },
                    harvested: sb.harvested,
                }));

                // Set all state
                setPlayers([player]);
                setWorlds([world]);
                setBeji([beji]);
                setStaticBeji(staticBeji);
            } catch (err) {
                console.error("Error loading world:", err);
                setError(err instanceof Error ? err.message : "Failed to load world");
            } finally {
                setLoading(false);
            }
        }

        loadWorld();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worldId]);

    if (loading) {
        return (
            <div
                style={{
                    height: "100vh",
                    width: "100vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                }}
            >
                <div style={{ fontSize: "18px", color: "#000000" }}>Loading world...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    height: "100vh",
                    width: "100vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                }}
            >
                <div style={{ fontSize: "18px", color: "#ef4444" }}>Error: {error}</div>
            </div>
        );
    }

    return (
        <div
            style={{
                height: "100vh",
                width: "100vw",
                margin: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
            }}
        >
            <Map />
        </div>
    );
}

