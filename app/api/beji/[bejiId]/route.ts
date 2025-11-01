import { NextRequest, NextResponse } from "next/server";
import { getBeji, saveBeji } from "../../../../src/lib/redis/gameState";
import type { Beji } from "../../../../components/atoms";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ bejiId: string }> }
): Promise<NextResponse<Beji | { error: string }>> {
    try {
        const { bejiId } = await params;
        const beji = await getBeji(bejiId);
        if (!beji) {
            return NextResponse.json(
                { error: "Beji not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(beji);
    } catch (error) {
        console.error("Error fetching beji:", error);
        return NextResponse.json(
            { error: "Failed to fetch beji" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ bejiId: string }> }
): Promise<NextResponse<Beji | { error: string }>> {
    try {
        const { bejiId } = await params;
        const beji = (await request.json()) as Beji;
        if (beji.id !== bejiId) {
            return NextResponse.json(
                { error: "Beji ID mismatch" },
                { status: 400 }
            );
        }
        const success = await saveBeji(beji);
        if (!success) {
            return NextResponse.json(
                { error: "Failed to update beji" },
                { status: 500 }
            );
        }
        return NextResponse.json(beji);
    } catch (error) {
        console.error("Error updating beji:", error);
        return NextResponse.json(
            { error: "Failed to update beji" },
            { status: 500 }
        );
    }
}

