import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "../../../../../src/lib/auth/jwt";
import { getPlayerIdForUser, getBejiForPlayer, updateBejiPosition, getBeji } from "../../../../../src/lib/redis/gameState";
import { BejiSyncService } from "../../../../../src/proto/beji/v1/beji_connect";
import { BejiPositionUpdate } from "../../../../../src/proto/beji/v1/beji_pb";
import { Position } from "../../../../../src/proto/common/v1/common_pb";
import { createConnectRouter } from "@connectrpc/connect";
import { nextJsApiHandler } from "@connectrpc/connect-next";
import type { HandlerOptions } from "@connectrpc/connect";

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
    async syncBejiPosition(ctx, req) {
        // Authenticate connection
        const { playerId } = await authenticateRequest();

        // Handle incoming updates
        for await (const update of req) {
            const bejiId = update.bejiId;

            if (!bejiId) {
                continue;
            }

            // Verify beji belongs to this player
            const beji = await getBeji(bejiId);
            if (!beji || beji.playerId !== playerId) {
                console.error(`Unauthorized beji sync attempt: ${bejiId} by player ${playerId}`);
                continue;
            }

            // Update position in Redis
            const position = update.position ? { x: update.position.x, y: update.position.y } : undefined;
            const target = update.target ? { x: update.target.x, y: update.target.y } : undefined;
            const walk = update.walk;

            if (position) {
                await updateBejiPosition(bejiId, position, target, walk);
            }

            // Echo back the update (or send to other clients if implementing multi-player sync)
            const response = new BejiPositionUpdate({
                bejiId,
                position: position ? new Position({ x: position.x, y: position.y }) : undefined,
                target: target ? new Position({ x: target.x, y: target.y }) : undefined,
                walk: walk !== undefined ? walk : beji.walk,
            });

            yield response;
        }
    },
});

const handlerOptions: HandlerOptions = {
    // Handle CORS if needed
    cors: {
        origin: true,
        credentials: true,
    },
};

export const POST = nextJsApiHandler({ router, ...handlerOptions });
export const GET = nextJsApiHandler({ router, ...handlerOptions });

