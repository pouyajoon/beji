import { cookies } from "next/headers";
import { verifyJWT } from "../../../../../src/lib/auth/jwt";
import { getPlayerIdForUser, updateBejiPosition, getBeji, getBejiForPlayer } from "../../../../../src/lib/redis/gameState";
import { BejiSyncService } from "../../../../../src/proto/beji/v1/beji_connect";
import { BejiPositionUpdate } from "../../../../../src/proto/beji/v1/beji_pb";
import { Position } from "../../../../../src/proto/common/v1/common_pb";
import { createConnectRouter } from "@connectrpc/connect";
import { nextJsApiRouter } from "@connectrpc/connect-next";

export const dynamic = "force-dynamic";

async function authenticateRequest(): Promise<{ userId: string; playerId: string }> {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
        throw new Error("Unauthorized");
    }

    const payload = await verifyJWT(token.value);
    const userId = payload.userId;

    const playerId = await getPlayerIdForUser(userId);
    if (!playerId) {
        throw new Error("Player not found");
    }

    return { userId, playerId };
}

const router = createConnectRouter().service(BejiSyncService, {
    async *syncBejiPosition(ctx, req) {
        // Authenticate connection
        let playerId: string;
        try {
            const auth = await authenticateRequest();
            playerId = auth.playerId;
        } catch (error) {
            console.error("Authentication failed in beji sync:", error);
            throw new Error("Unauthorized");
        }

        // Handle incoming updates
        for await (const update of req) {
            const bejiId = update.bejiId;

            if (!bejiId) {
                continue;
            }

            // Verify beji belongs to this player
            const beji = await getBeji(bejiId);
            if (!beji) {
                console.error(`Beji ${bejiId} not found`);
                continue;
            }

            if (beji.playerId !== playerId) {
                // Double-check by looking at player's beji list
                const playerBejis = await getBejiForPlayer(playerId);
                const isOwnedByPlayer = playerBejis.some((b) => b.id === bejiId);
                
                if (!isOwnedByPlayer) {
                    console.error(`Unauthorized beji sync attempt: ${bejiId} by player ${playerId}`);
                    continue;
                } else {
                    console.warn(`Warning: beji ${bejiId} playerId mismatch but found in player's list - allowing`);
                }
            }

            // Update position in Redis
            const position = update.position ? { x: update.position.x, y: update.position.y } : undefined;
            const target = update.target ? { x: update.target.x, y: update.target.y } : undefined;
            const walk = update.walk;

            if (position) {
                await updateBejiPosition(bejiId, position, target, walk);
                
                // Get updated beji to echo back
                const updatedBeji = await getBeji(bejiId);
                if (updatedBeji) {
                    const response = new BejiPositionUpdate({
                        bejiId,
                        position: new Position({ x: updatedBeji.position.x, y: updatedBeji.position.y }),
                        target: updatedBeji.target ? new Position({ x: updatedBeji.target.x, y: updatedBeji.target.y }) : undefined,
                        walk: updatedBeji.walk,
                    });

                    yield response;
                }
            }
        }
    },
});

const { handler, config } = nextJsApiRouter({ routes: router });

export { handler as POST, handler as GET, config };

