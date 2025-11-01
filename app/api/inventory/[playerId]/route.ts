import { NextRequest, NextResponse } from "next/server";
import {
    getInventory,
    saveInventory,
    updateInventoryItem,
} from "../../../../src/lib/redis/gameState";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
): Promise<NextResponse<Record<number, number> | { error: string }>> {
    try {
        const { playerId } = await params;
        const inventory = await getInventory(playerId);
        return NextResponse.json(inventory);
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
): Promise<NextResponse<Record<number, number> | { error: string }>> {
    try {
        const { playerId } = await params;
        const body = await request.json();
        
        // If updating a specific item
        if (typeof body.codepoint === "number" && typeof body.delta === "number") {
            const success = await updateInventoryItem(playerId, body.codepoint, body.delta);
            if (!success) {
                return NextResponse.json(
                    { error: "Failed to update inventory item" },
                    { status: 500 }
                );
            }
            const inventory = await getInventory(playerId);
            return NextResponse.json(inventory);
        }
        
        // If replacing entire inventory
        if (typeof body === "object" && body !== null) {
            const inventory = body as Record<number, number>;
            const success = await saveInventory(playerId, inventory);
            if (!success) {
                return NextResponse.json(
                    { error: "Failed to update inventory" },
                    { status: 500 }
                );
            }
            return NextResponse.json(inventory);
        }
        
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error updating inventory:", error);
        return NextResponse.json(
            { error: "Failed to update inventory" },
            { status: 500 }
        );
    }
}

