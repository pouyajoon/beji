import type { Handler } from '@netlify/functions';
import type {
  CreateWorldRequest,
  CreateWorldResponse,
  GetWorldRequest,
  GetWorldResponse,
  WorldData,
  World,
} from '../../src/proto/world/v1/world_pb';
import {
  CreateWorldRequestSchema,
  CreateWorldResponseSchema,
  GetWorldRequestSchema,
  GetWorldResponseSchema,
  WorldDataSchema,
  WorldSchema,
} from '../../src/proto/world/v1/world_pb';
import type { Player } from '../../src/proto/player/v1/player_pb';
import { PlayerSchema } from '../../src/proto/player/v1/player_pb';
import type { Beji } from '../../src/proto/beji/v1/beji_pb';
import { BejiSchema } from '../../src/proto/beji/v1/beji_pb';
import type { StaticBeji } from '../../src/proto/staticbeji/v1/staticbeji_pb';
import { StaticBejiSchema } from '../../src/proto/staticbeji/v1/staticbeji_pb';
import type { Position } from '../../src/proto/common/v1/common_pb';
import { PositionSchema } from '../../src/proto/common/v1/common_pb';
import { create, fromJson, toJson, protoInt64 } from '@bufbuild/protobuf';
import { codepointsToEmoji } from '../../components/emoji';
import {
  savePlayer,
  saveBeji,
  saveStaticBeji,
  saveWorld,
  getWorld as getWorldFromRedis,
  getBeji,
  getPlayer,
  getStaticBejiForWorld,
} from '../../src/lib/redis/gameState';
import type {
  Beji as BejiType,
  Player as PlayerType,
  StaticBeji as StaticBejiType,
  World as WorldType,
} from '../../components/atoms';

function convertAppToProto(
  world: WorldType,
  player: PlayerType,
  beji: BejiType,
  staticBeji: StaticBejiType[]
): WorldData {
  return create(WorldDataSchema, {
    world: create(WorldSchema, {
      id: world.id,
      mainBejiId: world.mainBejiId,
      staticBejiIds: world.staticBejiIds,
      createdAt: protoInt64.parse(world.createdAt.toString()),
    }),
    player: create(PlayerSchema, {
      id: player.id,
      emoji: player.emoji,
      emojiCodepoints: player.emojiCodepoints,
      bejiIds: player.bejiIds,
      createdAt: protoInt64.parse(player.createdAt.toString()),
    }),
    beji: create(BejiSchema, {
      id: beji.id,
      playerId: beji.playerId,
      worldId: beji.worldId,
      emoji: beji.emoji,
      name: beji.name,
      position: create(PositionSchema, { x: beji.position.x, y: beji.position.y }),
      target: beji.target
        ? create(PositionSchema, { x: beji.target.x, y: beji.target.y })
        : undefined,
      walk: beji.walk,
      createdAt: protoInt64.parse(beji.createdAt.toString()),
    }),
    staticBeji: staticBeji.map(
      (sb) =>
        create(StaticBejiSchema, {
          id: sb.id,
          worldId: sb.worldId,
          emojiCodepoint: sb.emojiCodepoint,
          emoji: sb.emoji,
          position: create(PositionSchema, { x: sb.position.x, y: sb.position.y }),
          harvested: sb.harvested,
        })
    ),
  });
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { method, params } = body;

    if (method === 'CreateWorld') {
      const req = fromJson(CreateWorldRequestSchema, params);

      if (
        !req.bejiName ||
        !req.emojiCodepoints ||
        req.emojiCodepoints.length === 0
      ) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'bejiName and emojiCodepoints are required',
          }),
        };
      }

      const emojiChar = codepointsToEmoji(req.emojiCodepoints);
      const timestamp = Date.now();
      const playerId = `player-${timestamp}`;
      const worldId = `world-${timestamp}`;
      const bejiId = `beji-${timestamp}`;

      const startX = 0;
      const startY = 0;

      const newPlayer: PlayerType = {
        id: playerId,
        emoji: emojiChar,
        emojiCodepoints: req.emojiCodepoints,
        bejiIds: [bejiId],
        createdAt: timestamp,
      };

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

      const baseUnicode = req.emojiCodepoints[0] ?? 0x1f600;
      const staticBejis: StaticBejiType[] = [];
      const staticBejiIds: string[] = [];

      for (let offset = -5; offset <= 5; offset++) {
        const staticUnicode = baseUnicode + offset;
        const staticEmoji = codepointsToEmoji([staticUnicode]);

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

      const newWorld: WorldType = {
        id: worldId,
        mainBejiId: bejiId,
        staticBejiIds: staticBejiIds,
        createdAt: timestamp,
      };

      await Promise.all([
        savePlayer(newPlayer),
        saveBeji(newBeji),
        saveWorld(newWorld),
        ...staticBejis.map((sb) => saveStaticBeji(sb)),
      ]);

      const worldData = convertAppToProto(newWorld, newPlayer, newBeji, staticBejis);
      const response = create(CreateWorldResponseSchema, { world: worldData });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toJson(CreateWorldResponseSchema, response)),
      };
    } else if (method === 'GetWorld') {
      const req = fromJson(GetWorldRequestSchema, params);

      if (!req.worldId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'worldId is required' }),
        };
      }

      const world = await getWorldFromRedis(req.worldId);
      if (!world) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'World not found' }),
        };
      }

      const beji = await getBeji(world.mainBejiId);
      if (!beji) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Main beji not found' }),
        };
      }

      const player = await getPlayer(beji.playerId);
      if (!player) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Player not found' }),
        };
      }

      const staticBeji = await getStaticBejiForWorld(world.id);
      // Import helper function or inline conversion
      const worldData = convertAppToProto(world, player, beji, staticBeji);
      const response = create(GetWorldResponseSchema, { world: worldData });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toJson(GetWorldResponseSchema, response)),
      };
    }

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: `Unknown method: ${method}` }),
    };
  } catch (error) {
    console.error('Error in world RPC handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

