import { NextRequest, NextResponse } from "next/server";
import { getWorld, saveWorld, getStaticBejiForWorld } from "../../../../src/lib/redis/gameState";
import type { World, StaticBeji } from "../../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
): Promise<NextResponse<World | StaticBeji[] | { error: string }>> {
    try {
        const { worldId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const includeStaticBeji = searchParams.get("includeStaticBeji") === "true";

        const world = await getWorld(worldId);
        if (!world) {
            return NextResponse.json(
                { error: "World not found" },
                { status: 404 }
            );
        }

        if (includeStaticBeji) {
            const staticBeji = await getStaticBejiForWorld(worldId);
            return NextResponse.json(staticBeji);
        }

        return NextResponse.json(world);
    } catch (error) {
        console.error("Error fetching world:", error);
        return NextResponse.json(
            { error: "Failed to fetch world" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
): Promise<NextResponse<World | { error: string }>> {
    try {
        const { worldId } = await params;
        const world = (await request.json()) as World;
        if (world.id !== worldId) {
            return NextResponse.json(
                { error: "World ID mismatch" },
                { status: 400 }
            );
        }
        const success = await saveWorld(world);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to update world" },
                { status: 500 }
            );
        }
        return NextResponse.json(world);
    } catch (error) {
        console.error("Error updating world:", error);
        return NextResponse.json(
            { error: "Failed to update world" },
            { status: 500 }
        );
    }
}

