import type { ConnectRouter } from '@connectrpc/connect';
import { WorldService } from '../../../proto/world/v1/world_connect';
import type {
  CreateWorldRequest,
  CreateWorldResponse,
  GetWorldRequest,
  GetWorldResponse,
} from '../../../proto/world/v1/world_pb';
import { create, protoInt64 } from '@bufbuild/protobuf';
import {
  CreateWorldRequestSchema,
  CreateWorldResponseSchema,
  GetWorldRequestSchema,
  GetWorldResponseSchema,
  WorldDataSchema,
  WorldSchema,
} from '../../../proto/world/v1/world_pb';
import { PlayerSchema } from '../../../proto/player/v1/player_pb';
import { BejiSchema } from '../../../proto/beji/v1/beji_pb';
import { PositionSchema } from '../../../proto/common/v1/common_pb';
import { StaticBejiSchema } from '../../../proto/staticbeji/v1/staticbeji_pb';
import type {
  Beji as BejiType,
  Player as PlayerType,
  StaticBeji as StaticBejiType,
  World as WorldType,
} from '../../../../components/atoms';
import {
  savePlayer,
  saveBeji,
  saveWorld,
  saveStaticBeji,
  getWorld as getWorldFromRedis,
  getBeji,
  getPlayer,
  getStaticBejiForWorld,
} from '../../redis/gameState';
import { codepointsToEmoji } from '../../../../components/emoji';

function convertAppToProto(
  world: WorldType,
  player: PlayerType,
  beji: BejiType,
  staticBeji: StaticBejiType[]
) {
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
    staticBeji: staticBeji.map((sb) =>
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

export function registerWorldService(router: ConnectRouter) {
  router.service(WorldService as any, {
    // @ts-expect-error - Service type compatibility
    async createWorld(req: CreateWorldRequest) {
      if (!req.bejiName || !req.emojiCodepoints || req.emojiCodepoints.length === 0) {
        throw new Error('bejiName and emojiCodepoints are required');
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

        const staticBejiId = `static-beji-${timestamp}-${offset}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;
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
      return create(CreateWorldResponseSchema, { world: worldData });
    },

    // @ts-expect-error - Service type compatibility
    async getWorld(req: GetWorldRequest) {
      if (!req.worldId) {
        throw new Error('worldId is required');
      }

      const world = await getWorldFromRedis(req.worldId);
      if (!world) {
        throw new Error('World not found');
      }

      const beji = await getBeji(world.mainBejiId);
      if (!beji) {
        throw new Error('Main beji not found');
      }

      const player = await getPlayer(beji.playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      const staticBeji = await getStaticBejiForWorld(world.id);
      const worldData = convertAppToProto(world, player, beji, staticBeji);
      return create(GetWorldResponseSchema, { world: worldData });
    },
  });
}

