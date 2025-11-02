import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "../../../../src/lib/auth/jwt";
import { getPlayerIdForUser, getBejiForPlayer, updateBejiPosition, getBeji } from "../../../../src/lib/redis/gameState";
import type { Beji as BejiType } from "../../../../components/atoms";

export const dynamic = "force-dynamic";

interface WebSocketMessage {
    type: "update" | "ping" | "pong";
    bejiId?: string;
    position?: { x: number; y: number };
    target?: { x: number; y: number };
    walk?: boolean;
}

/**
 * WebSocket handler for beji position synchronization
 * Note: Next.js App Router doesn't support WebSocket upgrades directly.
 * This is a placeholder that returns an upgrade response.
 * For production, you may need a custom server or use Connect streaming RPC instead.
 */
export async function GET(request: NextRequest): Promise<Response> {
    try {
        // Verify authentication
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return new Response("Unauthorized", { status: 401 });
        }

        const payload = await verifyJWT(token.value);
        const userId = payload.userId;

        // Get player ID for this user
        const playerId = await getPlayerIdForUser(userId);
        if (!playerId) {
            return new Response("Player not found", { status: 404 });
        }

        // Get user's bejis
        const bejis = await getBejiForPlayer(playerId);
        if (bejis.length === 0) {
            return new Response("No bejis found", { status: 404 });
        }

        // Check for WebSocket upgrade header
        const upgradeHeader = request.headers.get("upgrade");
        const connectionHeader = request.headers.get("connection");

        if (upgradeHeader?.toLowerCase() === "websocket" && connectionHeader?.toLowerCase().includes("upgrade")) {
            // For Next.js App Router, WebSocket upgrades need custom server setup
            // This is a simplified handler - in production, consider using:
            // 1. A separate WebSocket server
            // 2. Connect streaming RPC
            // 3. Custom Next.js server configuration

            // Return a response indicating WebSocket is supported but needs custom setup
            return new Response(
                JSON.stringify({
                    error: "WebSocket requires custom server configuration. Consider using Connect streaming RPC instead.",
                    alternative: "/api/rpc/beji/v1/sync"
                }),
                {
                    status: 426,
                    headers: {
                        "Content-Type": "application/json",
                        "Upgrade": "websocket"
                    }
                }
            );
        }

        // For HTTP requests, return initial beji state
        return Response.json({
            bejis: bejis.map((beji) => ({
                id: beji.id,
                position: beji.position,
                target: beji.target,
                walk: beji.walk,
            }))
        });
    } catch (error) {
        console.error("Error in WebSocket handler:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

/**
 * Handle POST requests for position updates (fallback when WebSocket isn't available)
 */
export async function POST(request: NextRequest): Promise<Response> {
    try {
        // Verify authentication
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyJWT(token.value);
        const userId = payload.userId;

        // Get player ID for this user
        const playerId = await getPlayerIdForUser(userId);
        if (!playerId) {
            return Response.json({ error: "Player not found" }, { status: 404 });
        }

        const body = await request.json() as WebSocketMessage;

        if (body.type === "update" && body.bejiId && body.position) {
            // Verify beji belongs to this user
            const beji = await getBeji(body.bejiId);
            if (!beji || beji.playerId !== playerId) {
                return Response.json({ error: "Forbidden" }, { status: 403 });
            }

            // Update position in Redis
            const success = await updateBejiPosition(
                body.bejiId,
                body.position,
                body.target,
                body.walk
            );

            if (success) {
                // Get updated beji data and return it
                const updatedBeji = await getBeji(body.bejiId);
                if (updatedBeji) {
                    return Response.json({
                        success: true,
                        position: updatedBeji.position,
                        target: updatedBeji.target,
                        walk: updatedBeji.walk,
                    });
                } else {
                    return Response.json({ success: true });
                }
            } else {
                return Response.json({ error: "Failed to update position" }, { status: 500 });
            }
        }

        return Response.json({ error: "Invalid request" }, { status: 400 });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return Response.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

