import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "../../../../../src/lib/auth/jwt";
import { getPlayerIdForUser, getBejiForPlayer, getWorld } from "../../../../../src/lib/redis/gameState";

export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
): Promise<NextResponse> {
    try {
        // Verify authentication
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");
        
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyJWT(token.value);
        
        // Verify user is requesting their own data
        if (payload.userId !== params.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get player ID for this user
        const playerId = await getPlayerIdForUser(params.userId);
        
        if (!playerId) {
            // User has no player yet, return empty array
            return NextResponse.json({ bejis: [] });
        }

        // Get all bejis for this player
        const bejis = await getBejiForPlayer(playerId);
        
        // Get world info for each beji
        const bejisWithWorlds = await Promise.all(
            bejis.map(async (beji) => {
                const world = beji.worldId ? await getWorld(beji.worldId) : null;
                return {
                    ...beji,
                    world: world ? {
                        id: world.id,
                        mainBejiId: world.mainBejiId,
                        createdAt: world.createdAt,
                    } : null,
                };
            })
        );

        return NextResponse.json({ bejis: bejisWithWorlds });
    } catch (error) {
        console.error("Error getting user bejis:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

