import { NextRequest, NextResponse } from "next/server";
import { getAllWorlds, saveWorld } from "../../../src/lib/redis/gameState";
import type { World } from "../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<World[] | { error: string }>> {
    try {
        const worlds = await getAllWorlds();
        return NextResponse.json(worlds);
    } catch (error) {
        console.error("Error fetching worlds:", error);
        return NextResponse.json(
            { error: "Failed to fetch worlds" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<World | { error: string }>> {
    try {
        const world = (await request.json()) as World;
        const success = await saveWorld(world);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to save world" },
                { status: 500 }
            );
        }
        return NextResponse.json(world);
    } catch (error) {
        console.error("Error saving world:", error);
        return NextResponse.json(
            { error: "Failed to save world" },
            { status: 500 }
        );
    }
}

