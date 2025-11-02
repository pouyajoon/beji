import { protoInt64, type Message } from '@bufbuild/protobuf';

// Helper function to create proto messages (compatible with v1 API)
function create<T extends Message<T>>(MessageClass: new (data?: any) => T, data?: any): T {
  return new MessageClass(data);
}
import type { Beji as BejiType, Player as PlayerType, StaticBeji as StaticBejiType, World as WorldType } from '../../components/atoms';
import {
  WorldData,
  World,
} from '../../src/proto/world/v1/world_pb';
import { Player } from '../../src/proto/player/v1/player_pb';
import { Beji } from '../../src/proto/beji/v1/beji_pb';
import { StaticBeji } from '../../src/proto/staticbeji/v1/staticbeji_pb';
import { Position } from '../../src/proto/common/v1/common_pb';
import {
  WorldSummary,
  BejiWithWorld,
} from '../../src/proto/player/v1/player_pb';

// Helper to convert app types to proto types
export function convertAppToProto(
  world: WorldType,
  player: PlayerType,
  beji: BejiType,
  staticBeji: StaticBejiType[]
): WorldData {
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
      target: beji.target ? create(Position, { x: beji.target.x, y: beji.target.y }) : undefined,
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

export function convertBejiToProto(beji: BejiType): Beji {
  return create(Beji, {
    id: beji.id,
    playerId: beji.playerId,
    worldId: beji.worldId,
    emoji: beji.emoji,
    name: beji.name,
    position: create(Position, { x: beji.position.x, y: beji.position.y }),
    target: beji.target ? create(Position, { x: beji.target.x, y: beji.target.y }) : undefined,
    walk: beji.walk,
    createdAt: protoInt64.parse(beji.createdAt.toString()),
  });
}

export function convertWorldToSummary(world: WorldType | null): WorldSummary | null {
  if (!world) return null;
  return create(WorldSummary, {
    id: world.id,
    mainBejiId: world.mainBejiId,
    createdAt: protoInt64.parse(world.createdAt.toString()),
  });
}

