import { NextRequest, NextResponse } from "next/server";
import { getPlayer, savePlayer } from "../../../../src/lib/redis/gameState";
import type { Player } from "../../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
): Promise<NextResponse<Player | { error: string }>> {
    try {
        const { playerId } = await params;
        const player = await getPlayer(playerId);
        if (!player) {
            return NextResponse.json(
                { error: "Player not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(player);
    } catch (error) {
        console.error("Error fetching player:", error);
        return NextResponse.json(
            { error: "Failed to fetch player" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
): Promise<NextResponse<Player | { error: string }>> {
    try {
        const { playerId } = await params;
        const player = (await request.json()) as Player;
        if (player.id !== playerId) {
            return NextResponse.json(
                { error: "Player ID mismatch" },
                { status: 400 }
            );
        }
        const success = await savePlayer(player);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to update player" },
                { status: 500 }
            );
        }
        return NextResponse.json(player);
    } catch (error) {
        console.error("Error updating player:", error);
        return NextResponse.json(
            { error: "Failed to update player" },
            { status: 500 }
        );
    }
}

