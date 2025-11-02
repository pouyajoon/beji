import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "../../../../src/lib/auth/jwt";
import { getPlayerIdForUser, updateBejiPosition, getBeji, getBejiForPlayer } from "../../../../src/lib/redis/gameState";

export const dynamic = "force-dynamic";

// WebSocket handler for beji position synchronization
// Note: Next.js App Router doesn't support WebSocket upgrades in route handlers
// This is a workaround that returns instructions for using a custom WebSocket server
// For production, consider using a custom Next.js server or a separate WebSocket server
export async function GET(request: NextRequest): Promise<Response> {
    // Check for WebSocket upgrade request
    const upgradeHeader = request.headers.get("upgrade");
    const connectionHeader = request.headers.get("connection");

    if (upgradeHeader?.toLowerCase() === "websocket" && connectionHeader?.toLowerCase().includes("upgrade")) {
        // Next.js App Router doesn't support WebSocket upgrades directly
        // Return a 426 Upgrade Required response
        return new Response(
            JSON.stringify({
                error: "WebSocket upgrade not supported in Next.js App Router route handlers",
                message: "Use a custom Next.js server or separate WebSocket server for WebSocket support",
            }),
            {
                status: 426,
                headers: {
                    "Content-Type": "application/json",
                    "Upgrade": "websocket",
                },
            }
        );
    }

    // For HTTP GET requests, return connection info
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token");

        if (!token) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyJWT(token.value);
        const playerId = await getPlayerIdForUser(payload.userId);

        return Response.json({
            message: "WebSocket endpoint",
            playerId,
            websocketUrl: `${request.nextUrl.protocol === "https:" ? "wss:" : "ws:"}//${request.nextUrl.host}/api/ws/beji-sync`,
        });
    } catch (error) {
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

