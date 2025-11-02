import type { ConnectRouter, HandlerContext } from '@connectrpc/connect';
import { createContextKey } from '@connectrpc/connect';
import { PlayerService } from '../../../proto/player/v1/player_connect';
import type {
    GetUserBejisRequest,
    GetUserBejisResponse,
} from '../../../proto/player/v1/player_pb';
import { create, protoInt64 } from '@bufbuild/protobuf';
import {
    GetUserBejisResponseSchema,
    BejiWithWorldSchema,
    WorldSummarySchema,
} from '../../../proto/player/v1/player_pb';
import { BejiSchema } from '../../../proto/beji/v1/beji_pb';
import { PositionSchema } from '../../../proto/common/v1/common_pb';
import type { Beji as BejiType, World as WorldType } from '../../../../components/atoms';
import {
    getPlayerIdForUser,
    getBejiForPlayer as getBejiForPlayerRedis,
    getWorld as getWorldFromRedis,
} from '../../redis/gameState';
import type { JWTPayload } from '../../auth/jwt';

// Context key for authentication
export const AUTH_CONTEXT_KEY = createContextKey<JWTPayload | undefined>(undefined, {
    description: 'auth',
});

function convertBejiToProto(beji: BejiType) {
    return create(BejiSchema, {
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
    });
}

function convertWorldToSummary(world: WorldType | null) {
    if (!world) return undefined;
    return create(WorldSummarySchema, {
        id: world.id,
        mainBejiId: world.mainBejiId,
        createdAt: protoInt64.parse(world.createdAt.toString()),
    });
}

export function registerPlayerService(router: ConnectRouter) {
    router.service(PlayerService as any, {
        // @ts-expect-error - Service type compatibility
        async getUserBejis(req: GetUserBejisRequest, context: HandlerContext) {
            const authPayload = context.values.get(AUTH_CONTEXT_KEY) as JWTPayload | undefined;

            if (!authPayload) {
                throw new Error('Unauthorized');
            }

            if (req.userId !== authPayload.userId) {
                throw new Error('Forbidden');
            }

            const playerId = await getPlayerIdForUser(req.userId);
            if (!playerId) {
                return create(GetUserBejisResponseSchema, { bejis: [] });
            }

            const bejis = await getBejiForPlayerRedis(playerId);
            const bejisWithWorlds = await Promise.all(
                bejis.map(async (beji) => {
                    const world = beji.worldId ? await getWorldFromRedis(beji.worldId) : null;
                    return create(BejiWithWorldSchema, {
                        beji: convertBejiToProto(beji),
                        world: convertWorldToSummary(world),
                    });
                })
            );

            return create(GetUserBejisResponseSchema, { bejis: bejisWithWorlds });
        },
    });
}

