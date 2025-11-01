import { NextRequest, NextResponse } from "next/server";
import { getAllBeji, saveBeji, getBejiForPlayer } from "../../../src/lib/redis/gameState";
import type { Beji } from "../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse<Beji[] | { error: string }>> {
    try {
        const searchParams = request.nextUrl.searchParams;
        const playerId = searchParams.get("playerId");
        
        if (playerId) {
            const beji = await getBejiForPlayer(playerId);
            return NextResponse.json(beji);
        }
        
        const allBeji = await getAllBeji();
        return NextResponse.json(allBeji);
    } catch (error) {
        console.error("Error fetching beji:", error);
        return NextResponse.json(
            { error: "Failed to fetch beji" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<Beji | { error: string }>> {
    try {
        const beji = (await request.json()) as Beji;
        const success = await saveBeji(beji);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to save beji" },
                { status: 500 }
            );
        }
        return NextResponse.json(beji);
    } catch (error) {
        console.error("Error saving beji:", error);
        return NextResponse.json(
            { error: "Failed to save beji" },
            { status: 500 }
        );
    }
}

