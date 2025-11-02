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
    // If this is a WebSocket upgrade, the custom server should handle it
    // Don't interfere - return a simple response that won't block the upgrade
    const upgradeHeader = request.headers.get("upgrade");
    const connectionHeader = request.headers.get("connection");

    if (upgradeHeader?.toLowerCase() === "websocket" && connectionHeader?.toLowerCase().includes("upgrade")) {
        // WebSocket upgrades are handled by the custom server in server.ts
        // This route handler should not interfere - return 404 to let the server handle it
        // Note: In practice, the custom server should intercept WebSocket upgrades before Next.js routing
        return new Response(null, { status: 404 });
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

