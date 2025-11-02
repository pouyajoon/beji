"use client";

import { useEffect } from "react";
import type { Beji, World } from "../atoms";
import { getUserBejis } from "../../src/lib/rpc/playerClient";

export type BejisLoaderProps = {
    setUserSub: (userId: string | null) => void;
    setUserId: (userId: string | null) => void;
    setExistingBejis: (bejis: Array<Beji & { world?: World | null }>) => void;
    setIsLoadingBejis: (loading: boolean) => void;
};

export function BejisLoader({
    setUserSub,
    setUserId,
    setExistingBejis,
    setIsLoadingBejis,
}: BejisLoaderProps) {
    useEffect(() => {
        // Fetch user info and existing bejis
        async function fetchUserAndBejis() {
            try {
                // First, get user info
                const userResponse = await fetch("/authentication/oauth/get-token");
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    const currentUserId = userData.userId;
                    setUserId(currentUserId);
                    setUserSub(currentUserId);

                    // Then fetch bejis for this user via RPC
                    try {
                        const bejisData = await getUserBejis(currentUserId);

                        // Convert RPC response to app format
                        const convertedBejis = (bejisData.bejis || []).map((bw: any) => {
                            const beji: Beji = {
                                id: bw.beji.id,
                                playerId: bw.beji.playerId,
                                worldId: bw.beji.worldId,
                                emoji: bw.beji.emoji,
                                name: bw.beji.name,
                                position: bw.beji.position ? { x: bw.beji.position.x, y: bw.beji.position.y } : { x: 0, y: 0 },
                                target: bw.beji.target ? { x: bw.beji.target.x, y: bw.beji.target.y } : undefined,
                                walk: bw.beji.walk,
                                createdAt: Number(bw.beji.createdAt),
                            };

                            const world: World | null = bw.world ? {
                                id: bw.world.id,
                                mainBejiId: bw.world.mainBejiId,
                                staticBejiIds: [], // WorldSummary doesn't include staticBejiIds
                                createdAt: Number(bw.world.createdAt),
                            } : null;

                            return { ...beji, world };
                        });

                        setExistingBejis(convertedBejis);
                    } catch (error) {
                        console.error("Failed to fetch bejis:", error);
                        setExistingBejis([]);
                    }
                } else {
                    // Not authenticated
                    setUserId(null);
                    setExistingBejis([]);
                }
            } catch (error) {
                console.error("Failed to fetch user info or bejis:", error);
                setUserId(null);
                setExistingBejis([]);
            } finally {
                setIsLoadingBejis(false);
            }
        }

        fetchUserAndBejis();
    }, [setUserSub, setUserId, setExistingBejis, setIsLoadingBejis]);

    // This component doesn't render anything
    return null;
}

