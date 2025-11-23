"use client";

import { useEffect } from "react";

import type { Beji, World } from "../atoms";
import { userSubAtom } from "../atoms";
import type { BejiWithWorld } from "../../src/proto/player/v1/player_pb";
import { getUserBejis } from "../../src/lib/rpc/playerClient";
import { useAtomValue } from "../../lib/jotai";

type BejisLoaderProps = {
    setUserId: (userId: string | null) => void;
    setExistingBejis: (bejis: Array<Beji & { world?: World | null }>) => void;
    setIsLoadingBejis: (loading: boolean) => void;
};

export function BejisLoader({
    setUserId,
    setExistingBejis,
    setIsLoadingBejis,
}: BejisLoaderProps) {
    const userId = useAtomValue(userSubAtom); // Utiliser l'atom au lieu de refetch /get-token

    useEffect(() => {
        // Fetch existing bejis - userId vient déjà de l'atom (défini par AuthenticatedPage)
        async function fetchBejis() {
            if (!userId) {
                setUserId(null);
                setExistingBejis([]);
                setIsLoadingBejis(false);
                return;
            }

            setUserId(userId);

            try {
                const bejisData = await getUserBejis(userId);

                // Convert RPC response to app format
                const convertedBejis = (bejisData.bejis || [])
                    .filter((bw: BejiWithWorld) => bw.beji != null)
                    .map((bw: BejiWithWorld) => {
                        const beji = bw.beji!; // Safe after filter
                        const bejiData: Beji = {
                            id: beji.id,
                            playerId: beji.playerId,
                            worldId: beji.worldId,
                            emoji: beji.emoji,
                            name: beji.name,
                            position: beji.position ? { x: beji.position.x, y: beji.position.y } : { x: 0, y: 0 },
                            target: beji.target ? { x: beji.target.x, y: beji.target.y } : undefined,
                            walk: beji.walk,
                            createdAt: Number(beji.createdAt),
                        };

                        const world: World | null = bw.world ? {
                            id: bw.world.id,
                            mainBejiId: bw.world.mainBejiId,
                            staticBejiIds: [], // WorldSummary doesn't include staticBejiIds
                            createdAt: Number(bw.world.createdAt),
                        } : null;

                        return { ...bejiData, world };
                    });

                setExistingBejis(convertedBejis);
            } catch (error) {
                console.error("Failed to fetch bejis:", error);
                setExistingBejis([]);
            } finally {
                setIsLoadingBejis(false);
            }
        }

        fetchBejis();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]); // Ne fetch que quand userId change

    // This component doesn't render anything
    return null;
}

