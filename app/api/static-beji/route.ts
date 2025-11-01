import { NextRequest, NextResponse } from "next/server";
import {
    getAllStaticBeji,
    saveStaticBeji,
    getStaticBeji,
    getStaticBejiForWorld,
} from "../../../src/lib/redis/gameState";
import type { StaticBeji } from "../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest
): Promise<NextResponse<StaticBeji[] | StaticBeji | { error: string }>> {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");
        const worldId = searchParams.get("worldId");

        if (id) {
            const staticBeji = await getStaticBeji(id);
            if (!staticBeji) {
                return NextResponse.json(
                    { error: "Static beji not found" },
                    { status: 404 }
                );
            }
            return NextResponse.json(staticBeji);
        }

        if (worldId) {
            const staticBeji = await getStaticBejiForWorld(worldId);
            return NextResponse.json(staticBeji);
        }

        const allStaticBeji = await getAllStaticBeji();
        return NextResponse.json(allStaticBeji);
    } catch (error) {
        console.error("Error fetching static beji:", error);
        return NextResponse.json(
            { error: "Failed to fetch static beji" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<StaticBeji | { error: string }>> {
    try {
        const staticBeji = (await request.json()) as StaticBeji;
        const success = await saveStaticBeji(staticBeji);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to save static beji" },
                { status: 500 }
            );
        }
        return NextResponse.json(staticBeji);
    } catch (error) {
        console.error("Error saving static beji:", error);
        return NextResponse.json(
            { error: "Failed to save static beji" },
            { status: 500 }
        );
    }
}

