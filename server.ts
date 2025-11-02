import { createServer } from "http";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { verifyJWT, type JWTPayload } from "./src/lib/auth/jwt";
import { getPlayerIdForUser, updateBejiPosition, getBeji, getBejiForPlayer } from "./src/lib/redis/gameState";
import type { Beji } from "./components/atoms";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Prepare Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Create HTTP server
    const server = createServer(async (req, res) => {
        try {
            // Use WHATWG URL API instead of deprecated url.parse()
            const host = req.headers.host || `${hostname}:${port}`;
            const url = new URL(req.url || "/", `http://${host}`);
            
            // Convert to format expected by Next.js handle function
            const parsedUrl = {
                pathname: url.pathname,
                query: Object.fromEntries(url.searchParams),
                href: url.href,
            };
            
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    // Create WebSocket server
    const wss = new WebSocketServer({ 
        server,
        path: "/api/ws/beji-sync",
    });

    // Store active connections
    const connections = new Map<string, WebSocket>();

    wss.on("connection", async (ws: WebSocket, req) => {
        let userId: string | null = null;
        let playerId: string | null = null;
        let bejiId: string | null = null;
        const connectionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        try {
            // Extract JWT token from cookies
            const cookies = req.headers.cookie || "";
            const tokenMatch = cookies.match(/auth_token=([^;]+)/);
            
            if (!tokenMatch || !tokenMatch[1]) {
                ws.close(1008, "Unauthorized: No token");
                return;
            }

            const token = tokenMatch[1];
            const payload: JWTPayload = await verifyJWT(token);
            userId = payload.userId;
            playerId = await getPlayerIdForUser(userId);

            if (!playerId) {
                ws.close(1008, "Unauthorized: Player not found");
                return;
            }

            connections.set(connectionId, ws);
            console.log(`WebSocket connected: ${connectionId} (user: ${userId}, player: ${playerId})`);

            // Handle incoming messages
            ws.on("message", async (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.type === "connect" && message.bejiId) {
                        // Verify beji belongs to this player
                        const beji = await getBeji(message.bejiId);
                        if (!beji || beji.playerId !== playerId) {
                            const playerBejis = await getBejiForPlayer(playerId!);
                            const isOwnedByPlayer = playerBejis.some((b) => b.id === message.bejiId);
                            
                            if (!isOwnedByPlayer) {
                                ws.send(JSON.stringify({
                                    error: "Forbidden",
                                    message: `Beji ${message.bejiId} does not belong to player`,
                                }));
                                return;
                            }
                        }

                        bejiId = message.bejiId;
                        console.log(`Beji ${bejiId} connected via WebSocket ${connectionId}`);

                        // Send confirmation
                        ws.send(JSON.stringify({
                            type: "connected",
                            bejiId: bejiId,
                        }));
                    } else if (message.type === "update" && message.bejiId && message.position) {
                        // Verify beji belongs to this player
                        if (message.bejiId !== bejiId) {
                            const beji = await getBeji(message.bejiId);
                            if (!beji || beji.playerId !== playerId) {
                                ws.send(JSON.stringify({
                                    error: "Forbidden",
                                }));
                                return;
                            }
                            bejiId = message.bejiId;
                        }

                        // Update position in Redis
                        const position = message.position as { x: number; y: number };
                        const target = message.target as { x: number; y: number } | undefined;
                        const walk = message.walk as boolean | undefined;

                        await updateBejiPosition(message.bejiId, position, target, walk);

                        // Get updated beji and send back
                        const updatedBeji = await getBeji(message.bejiId);
                        if (updatedBeji) {
                            ws.send(JSON.stringify({
                                type: "update",
                                bejiId: updatedBeji.id,
                                position: updatedBeji.position,
                                target: updatedBeji.target,
                                walk: updatedBeji.walk,
                            }));
                        }
                    } else if (message.type === "ping") {
                        ws.send(JSON.stringify({ type: "pong" }));
                    }
                } catch (error) {
                    console.error("Error handling WebSocket message:", error);
                    ws.send(JSON.stringify({
                        error: "Internal server error",
                        message: error instanceof Error ? error.message : "Unknown error",
                    }));
                }
            });

            // Send ping every 30 seconds to keep connection alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.ping();
                } else {
                    clearInterval(pingInterval);
                }
            }, 30000);

            ws.on("close", () => {
                connections.delete(connectionId);
                clearInterval(pingInterval);
                console.log(`WebSocket disconnected: ${connectionId}`);
            });

            ws.on("error", (error) => {
                console.error(`WebSocket error for ${connectionId}:`, error);
                connections.delete(connectionId);
            });

        } catch (error) {
            console.error("WebSocket connection error:", error);
            ws.close(1008, "Authentication failed");
        }
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws/beji-sync`);
    });
});

