import { NextRequest, NextResponse } from "next/server";
import { getGameState, saveGameState } from "../../../src/lib/redis/gameState";
import type { GameState } from "../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<GameState | { error: string }>> {
    try {
        const gameState = await getGameState();
        if (!gameState) {
            return NextResponse.json(
                {
                    players: [],
                    worlds: [],
                    beji: [],
                    staticBeji: [],
                    inventory: {},
                },
                { status: 200 }
            );
        }
        return NextResponse.json(gameState);
    } catch (error) {
        console.error("Error fetching game state:", error);
        return NextResponse.json(
            { error: "Failed to fetch game state" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
    try {
        const gameState = (await request.json()) as GameState;
        const success = await saveGameState(gameState);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to save game state" },
                { status: 500 }
            );
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving game state:", error);
        return NextResponse.json(
            { error: "Failed to save game state" },
            { status: 500 }
        );
    }
}

