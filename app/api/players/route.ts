import { NextRequest, NextResponse } from "next/server";
import { getAllPlayers, savePlayer } from "../../../src/lib/redis/gameState";
import type { Player } from "../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<Player[] | { error: string }>> {
    try {
        const players = await getAllPlayers();
        return NextResponse.json(players);
    } catch (error) {
        console.error("Error fetching players:", error);
        return NextResponse.json(
            { error: "Failed to fetch players" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<Player | { error: string }>> {
    try {
        const player = (await request.json()) as Player;
        const success = await savePlayer(player);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to save player" },
                { status: 500 }
            );
        }
        return NextResponse.json(player);
    } catch (error) {
        console.error("Error saving player:", error);
        return NextResponse.json(
            { error: "Failed to save player" },
            { status: 500 }
        );
    }
}

