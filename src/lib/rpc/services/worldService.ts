import type { ConnectRouter, HandlerContext, ServiceImpl } from '@connectrpc/connect';
import { AUTH_CONTEXT_KEY } from './playerService';
import type { JWTPayload } from '../../auth/jwt';
import { ConnectError, Code } from '@connectrpc/connect';
import type { Message } from '@bufbuild/protobuf';
import { protoInt64 } from '@bufbuild/protobuf';
import { WorldService } from '../../../proto/world/v1/world_connect';
import {
  CreateWorldRequest,
  CreateWorldResponse,
  GetWorldRequest,
  GetWorldResponse,
  WorldData,
  World,
} from '../../../proto/world/v1/world_pb';
import { Player } from '../../../proto/player/v1/player_pb';
import { Beji } from '../../../proto/beji/v1/beji_pb';
import { Position } from '../../../proto/common/v1/common_pb';
import { StaticBeji } from '../../../proto/staticbeji/v1/staticbeji_pb';

// Helper function to create proto messages (compatible with v1 API)
function create<T extends Message<T>>(MessageClass: new (data?: any) => T, data?: any): T {
  return new MessageClass(data);
}
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
  getOrCreateUser,
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
  return create(WorldData, {
    world: create(World, {
      id: world.id,
      mainBejiId: world.mainBejiId,
      staticBejiIds: world.staticBejiIds,
      createdAt: protoInt64.parse(world.createdAt.toString()),
    }),
    player: create(Player, {
      id: player.id,
      emoji: player.emoji,
      emojiCodepoints: player.emojiCodepoints,
      bejiIds: player.bejiIds,
      createdAt: protoInt64.parse(player.createdAt.toString()),
    }),
    beji: create(Beji, {
      id: beji.id,
      playerId: beji.playerId,
      worldId: beji.worldId,
      emoji: beji.emoji,
      name: beji.name,
      position: create(Position, { x: beji.position.x, y: beji.position.y }),
      target: beji.target
        ? create(Position, { x: beji.target.x, y: beji.target.y })
        : undefined,
      walk: beji.walk,
      createdAt: protoInt64.parse(beji.createdAt.toString()),
    }),
    staticBeji: staticBeji.map((sb) =>
      create(StaticBeji, {
        id: sb.id,
        worldId: sb.worldId,
        emojiCodepoint: sb.emojiCodepoint,
        emoji: sb.emoji,
        position: create(Position, { x: sb.position.x, y: sb.position.y }),
        harvested: sb.harvested,
      })
    ),
  });
}

export function registerWorldService(router: ConnectRouter) {
  router.service(
    WorldService,
    {
      async createWorld(req: CreateWorldRequest, context: HandlerContext): Promise<CreateWorldResponse> {
        try {
          if (!req.bejiName || !req.emojiCodepoints || req.emojiCodepoints.length === 0) {
            console.error('[WorldService.createWorld] Validation failed: bejiName and emojiCodepoints are required', { bejiName: req.bejiName, emojiCodepoints: req.emojiCodepoints });
            throw new Error('bejiName and emojiCodepoints are required');
          }

          // Get userId from auth context
          const authPayload = context.values.get(AUTH_CONTEXT_KEY) as JWTPayload | undefined;
          if (!authPayload || !authPayload.userId) {
            console.error('[WorldService.createWorld] Unauthorized: No auth payload or userId in context');
            throw new ConnectError('Unauthorized', Code.Unauthenticated);
          }
          const userId = authPayload.userId;

          // Create or update user in Redis
          await getOrCreateUser(userId, authPayload.email, authPayload.picture);

          const emojiChar = codepointsToEmoji(req.emojiCodepoints);
          const timestamp = Date.now();
          
          // Create a new player for each world (users can have multiple players)
          const playerId = `player-${timestamp}`;
          const worldId = `world-${timestamp}`;
          const bejiId = `beji-${timestamp}`;

          const startX = 0;
          const startY = 0;

          // Create new player
          const newPlayer: PlayerType = {
            id: playerId,
            userId: userId, // Link player to user
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
            savePlayer(newPlayer), // This will automatically add player to user's player list
            saveBeji(newBeji),
            saveWorld(newWorld),
            ...staticBejis.map((sb) => saveStaticBeji(sb)),
          ]);

          const worldData = convertAppToProto(newWorld, newPlayer, newBeji, staticBejis);
          return create(CreateWorldResponse, { world: worldData });
        } catch (error) {
          console.error('[WorldService.createWorld] Error:', error);
          throw error;
        }
      },

      async getWorld(req: GetWorldRequest, context: HandlerContext): Promise<GetWorldResponse> {
        try {
          if (!req.worldId) {
            console.error('[WorldService.getWorld] Validation failed: worldId is required');
            throw new ConnectError('worldId is required', Code.InvalidArgument);
          }

          // Get userId from auth context
          const authPayload = context.values.get(AUTH_CONTEXT_KEY) as JWTPayload | undefined;
          if (!authPayload || !authPayload.userId) {
            console.error('[WorldService.getWorld] Unauthorized: No auth payload or userId in context');
            throw new ConnectError('Unauthorized', Code.Unauthenticated);
          }
          const userId = authPayload.userId;

          const world = await getWorldFromRedis(req.worldId);
          if (!world) {
            console.error('[WorldService.getWorld] World not found:', req.worldId);
            throw new ConnectError(`World not found: ${req.worldId}`, Code.NotFound);
          }

          const beji = await getBeji(world.mainBejiId);
          if (!beji) {
            console.error('[WorldService.getWorld] Main beji not found:', world.mainBejiId);
            throw new ConnectError(`Main beji not found: ${world.mainBejiId}`, Code.NotFound);
          }

          const player = await getPlayer(beji.playerId);
          if (!player) {
            console.error('[WorldService.getWorld] Player not found:', beji.playerId);
            throw new ConnectError(`Player not found: ${beji.playerId}`, Code.NotFound);
          }

          // Verify that the world belongs to the authenticated user
          if (player.userId && player.userId !== userId) {
            console.error('[WorldService.getWorld] Forbidden: World does not belong to user', {
              worldId: req.worldId,
              requestedUserId: userId,
              worldOwnerUserId: player.userId,
            });
            throw new ConnectError('Forbidden: This world does not belong to you', Code.PermissionDenied);
          }

          const staticBeji = await getStaticBejiForWorld(world.id);
          const worldData = convertAppToProto(world, player, beji, staticBeji);
          return create(GetWorldResponse, { world: worldData });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error('[WorldService.getWorld] Error:', error, { 
            worldId: req.worldId,
            message: errorMessage,
            stack: errorStack 
          });
          
          // If it's already a ConnectError, re-throw it
          if (error instanceof ConnectError) {
            throw error;
          }
          
          // Otherwise, wrap it in a ConnectError with the actual error message
          throw new ConnectError(
            `GetWorld failed: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}`,
            Code.Internal
          );
        }
      },
    }
  );
}

