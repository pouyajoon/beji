import { create, protoInt64 } from '@bufbuild/protobuf';
import type { Beji as BejiType, Player as PlayerType, StaticBeji as StaticBejiType, World as WorldType } from '../../components/atoms';
import type {
  WorldData,
  World,
} from '../../src/proto/world/v1/world_pb';
import {
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
import type {
  WorldSummary,
  BejiWithWorld,
} from '../../src/proto/player/v1/player_pb';
import {
  WorldSummarySchema,
  BejiWithWorldSchema,
} from '../../src/proto/player/v1/player_pb';

// Helper to convert app types to proto types
export function convertAppToProto(
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
      target: beji.target ? create(PositionSchema, { x: beji.target.x, y: beji.target.y }) : undefined,
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

export function convertBejiToProto(beji: BejiType): Beji {
  return create(BejiSchema, {
    id: beji.id,
    playerId: beji.playerId,
    worldId: beji.worldId,
    emoji: beji.emoji,
    name: beji.name,
    position: create(PositionSchema, { x: beji.position.x, y: beji.position.y }),
    target: beji.target ? create(PositionSchema, { x: beji.target.x, y: beji.target.y }) : undefined,
    walk: beji.walk,
    createdAt: protoInt64.parse(beji.createdAt.toString()),
  });
}

export function convertWorldToSummary(world: WorldType | null): WorldSummary | null {
  if (!world) return null;
  return create(WorldSummarySchema, {
    id: world.id,
    mainBejiId: world.mainBejiId,
    createdAt: protoInt64.parse(world.createdAt.toString()),
  });
}

