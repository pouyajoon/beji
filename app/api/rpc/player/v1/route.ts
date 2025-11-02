import { NextRequest, NextResponse } from "next/server";
import {
    GetUserBejisRequest,
    GetUserBejisResponse,
    WorldSummary,
    BejiWithWorld,
} from "../../../../../src/proto/player/v1/player_pb";
import { Beji } from "../../../../../src/proto/beji/v1/beji_pb";
import { Position } from "../../../../../src/proto/common/v1/common_pb";
import { protoInt64 } from "@bufbuild/protobuf";
import {
    getPlayerIdForUser,
    getBejiForPlayer,
    getWorld,
} from "../../../../../src/lib/redis/gameState";
import type { Beji as BejiType, World as WorldType } from "../../../../../components/atoms";
import { cookies } from "next/headers";
import { verifyJWT } from "../../../../../src/lib/auth/jwt";

export const dynamic = "force-dynamic";

// Helper to convert app types to proto types
function convertBejiToProto(beji: BejiType): Beji {
    return new Beji({
        id: beji.id,
        playerId: beji.playerId,
        worldId: beji.worldId,
        emoji: beji.emoji,
        name: beji.name,
        position: new Position({ x: beji.position.x, y: beji.position.y }),
        target: beji.target ? new Position({ x: beji.target.x, y: beji.target.y }) : undefined,
        walk: beji.walk,
        createdAt: protoInt64.parse(beji.createdAt.toString()),
    });
}

function convertWorldToSummary(world: WorldType | null): WorldSummary | null {
    if (!world) return null;
    return new WorldSummary({
        id: world.id,
        mainBejiId: world.mainBejiId,
        createdAt: protoInt64.parse(world.createdAt.toString()),
    });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const method = body.method as string;
        const params = body.params;

        if (method === "GetUserBejis") {
            // Verify authentication
            const cookieStore = await cookies();
            const token = cookieStore.get("auth_token");
            
            if (!token) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                );
            }

            const payload = await verifyJWT(token.value);
            const userId = payload.userId;

            const req = GetUserBejisRequest.fromJson(params);

            // Verify user is requesting their own data
            if (req.userId !== userId) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            // Get player ID for this user
            const playerId = await getPlayerIdForUser(req.userId);
            
            if (!playerId) {
                // User has no player yet, return empty array
                const response = new GetUserBejisResponse({ bejis: [] });
                return NextResponse.json(response.toJson());
            }

            // Get all bejis for this player
            const bejis = await getBejiForPlayer(playerId);
            
            // Get world info for each beji
            const bejisWithWorlds = await Promise.all(
                bejis.map(async (beji) => {
                    const world = beji.worldId ? await getWorld(beji.worldId) : null;
                    return new BejiWithWorld({
                        beji: convertBejiToProto(beji),
                        world: convertWorldToSummary(world) || undefined,
                    });
                })
            );

            const response = new GetUserBejisResponse({
                bejis: bejisWithWorlds,
            });

            return NextResponse.json(response.toJson());
        } else {
            return NextResponse.json(
                { error: `Unknown method: ${method}` },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error in player RPC handler:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

