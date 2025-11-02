import { NextRequest, NextResponse } from "next/server";
import {
    CreateWorldRequest,
    CreateWorldResponse,
    GetWorldRequest,
    GetWorldResponse,
    WorldData,
    World,
} from "../../../../../src/proto/world/v1/world_pb";
import { Player } from "../../../../../src/proto/player/v1/player_pb";
import { Beji } from "../../../../../src/proto/beji/v1/beji_pb";
import { StaticBeji } from "../../../../../src/proto/staticbeji/v1/staticbeji_pb";
import { Position } from "../../../../../src/proto/common/v1/common_pb";
import { protoInt64 } from "@bufbuild/protobuf";
import { codepointsToEmoji } from "../../../../../components/emoji";
import {
    savePlayer,
    saveBeji,
    saveStaticBeji,
    saveWorld,
    getWorld as getWorldFromRedis,
    getBeji,
    getPlayer,
    getStaticBejiForWorld,
} from "../../../../../src/lib/redis/gameState";
import type { Player as PlayerType, Beji as BejiType, StaticBeji as StaticBejiType, World as WorldType } from "../../../../../components/atoms";

export const dynamic = "force-dynamic";

// Helper to convert proto types to app types
function convertProtoToApp(data: WorldData): {
    world: WorldType;
    player: PlayerType;
    beji: BejiType;
    staticBeji: StaticBejiType[];
} {
    if (!data.world || !data.player || !data.beji) {
        throw new Error("Missing required world data");
    }

    return {
        world: {
            id: data.world.id,
            mainBejiId: data.world.mainBejiId,
            staticBejiIds: data.world.staticBejiIds,
            createdAt: Number(data.world.createdAt.toString()),
        },
        player: {
            id: data.player.id,
            emoji: data.player.emoji,
            emojiCodepoints: data.player.emojiCodepoints,
            bejiIds: data.player.bejiIds,
            createdAt: Number(data.player.createdAt.toString()),
        },
        beji: {
            id: data.beji.id,
            playerId: data.beji.playerId,
            worldId: data.beji.worldId,
            emoji: data.beji.emoji,
            name: data.beji.name,
            position: data.beji.position ? { x: data.beji.position.x, y: data.beji.position.y } : { x: 0, y: 0 },
            target: data.beji.target ? { x: data.beji.target.x, y: data.beji.target.y } : { x: 0, y: 0 },
            walk: data.beji.walk,
            createdAt: Number(data.beji.createdAt.toString()),
        },
        staticBeji: data.staticBeji.map((sb) => ({
            id: sb.id,
            worldId: sb.worldId,
            emojiCodepoint: sb.emojiCodepoint,
            emoji: sb.emoji,
            position: sb.position ? { x: sb.position.x, y: sb.position.y } : { x: 0, y: 0 },
            harvested: sb.harvested,
        })),
    };
}

// Helper to convert app types to proto types
function convertAppToProto(
    world: WorldType,
    player: PlayerType,
    beji: BejiType,
    staticBeji: StaticBejiType[]
): WorldData {
    return new WorldData({
        world: new World({
            id: world.id,
            mainBejiId: world.mainBejiId,
            staticBejiIds: world.staticBejiIds,
            createdAt: protoInt64.parse(world.createdAt.toString()),
        }),
        player: new Player({
            id: player.id,
            emoji: player.emoji,
            emojiCodepoints: player.emojiCodepoints,
            bejiIds: player.bejiIds,
            createdAt: protoInt64.parse(player.createdAt.toString()),
        }),
        beji: new Beji({
            id: beji.id,
            playerId: beji.playerId,
            worldId: beji.worldId,
            emoji: beji.emoji,
            name: beji.name,
            position: new Position({ x: beji.position.x, y: beji.position.y }),
            target: beji.target ? new Position({ x: beji.target.x, y: beji.target.y }) : undefined,
            walk: beji.walk,
            createdAt: protoInt64.parse(beji.createdAt.toString()),
        }),
        staticBeji: staticBeji.map((sb) =>
            new StaticBeji({
                id: sb.id,
                worldId: sb.worldId,
                emojiCodepoint: sb.emojiCodepoint,
                emoji: sb.emoji,
                position: new Position({ x: sb.position.x, y: sb.position.y }),
                harvested: sb.harvested,
            })
        ),
    });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const method = body.method as string;
        const params = body.params;

        if (method === "CreateWorld") {
            const req = CreateWorldRequest.fromJson(params);

            if (!req.bejiName || !req.emojiCodepoints || req.emojiCodepoints.length === 0) {
                return NextResponse.json(
                    { error: "bejiName and emojiCodepoints are required" },
                    { status: 400 }
                );
            }

            const emojiChar = codepointsToEmoji(req.emojiCodepoints);
            const timestamp = Date.now();
            const playerId = `player-${timestamp}`;
            const worldId = `world-${timestamp}`;
            const bejiId = `beji-${timestamp}`;

            // New games always start at 0,0
            const startX = 0;
            const startY = 0;

            // Create player
            const newPlayer: PlayerType = {
                id: playerId,
                emoji: emojiChar,
                emojiCodepoints: req.emojiCodepoints,
                bejiIds: [bejiId],
                createdAt: timestamp,
            };

            // Create main beji
            const newBeji: BejiType = {
                id: bejiId,
                playerId: playerId,
                worldId: worldId,
                emoji: emojiChar,
                name: req.bejiName.trim(),
                position: { x: startX, y: startY },
                target: { x: startX, y: startY },
                walk: true,
                createdAt: timestamp,
            };

            // Create 10 static bejis with unicode offsets from -5 to +5
            const baseUnicode = req.emojiCodepoints[0] ?? 0x1f600;
            const staticBejis: StaticBejiType[] = [];
            const staticBejiIds: string[] = [];

            for (let offset = -5; offset <= 5; offset++) {
                const staticUnicode = baseUnicode + offset;
                const staticEmoji = codepointsToEmoji([staticUnicode]);

                // Generate random position within 150 meters of 0,0
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 150;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;

                const staticBejiId = `static-beji-${timestamp}-${offset}-${Math.random().toString(36).substring(2, 9)}`;
                staticBejiIds.push(staticBejiId);

                staticBejis.push({
                    id: staticBejiId,
                    worldId: worldId,
                    emojiCodepoint: staticUnicode,
                    emoji: staticEmoji,
                    position: { x, y },
                    harvested: false,
                });
            }

            // Create world
            const newWorld: WorldType = {
                id: worldId,
                mainBejiId: bejiId,
                staticBejiIds: staticBejiIds,
                createdAt: timestamp,
            };

            // Save all to Redis
            await Promise.all([
                savePlayer(newPlayer),
                saveBeji(newBeji),
                saveWorld(newWorld),
                ...staticBejis.map((sb) => saveStaticBeji(sb)),
            ]);

            // Convert to proto format and return
            const worldData = convertAppToProto(newWorld, newPlayer, newBeji, staticBejis);
            const response = new CreateWorldResponse({ world: worldData });

            return NextResponse.json(response.toJson());
        } else if (method === "GetWorld") {
            const req = GetWorldRequest.fromJson(params);

            if (!req.worldId) {
                return NextResponse.json(
                    { error: "worldId is required" },
                    { status: 400 }
                );
            }

            // Get world from Redis
            const world = await getWorldFromRedis(req.worldId);
            if (!world) {
                return NextResponse.json(
                    { error: "World not found" },
                    { status: 404 }
                );
            }

            // Get associated data
            const beji = await getBeji(world.mainBejiId);
            if (!beji) {
                return NextResponse.json(
                    { error: "Main beji not found" },
                    { status: 404 }
                );
            }

            const player = await getPlayer(beji.playerId);
            if (!player) {
                return NextResponse.json(
                    { error: "Player not found" },
                    { status: 404 }
                );
            }

            const staticBeji = await getStaticBejiForWorld(world.id);

            // Convert to proto format and return
            const worldData = convertAppToProto(world, player, beji, staticBeji);
            const response = new GetWorldResponse({ world: worldData });

            return NextResponse.json(response.toJson());
        } else {
            return NextResponse.json(
                { error: `Unknown method: ${method}` },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error in world RPC handler:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

