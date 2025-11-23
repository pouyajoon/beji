import type { Message } from '@bufbuild/protobuf';
import { protoInt64 } from '@bufbuild/protobuf';
import type { ConnectRouter, HandlerContext } from '@connectrpc/connect';
import { createContextKey } from '@connectrpc/connect';

import type { Beji as BejiType, World as WorldType } from '../../../../components/atoms';
import { Beji } from '../../../proto/beji/v1/beji_pb';
import { Position } from '../../../proto/common/v1/common_pb';
import { PlayerService } from '../../../proto/player/v1/player_connect';
import {
    GetUserBejisRequest,
    GetUserBejisResponse,
    BejiWithWorld,
    WorldSummary,
} from '../../../proto/player/v1/player_pb';

// Helper function to create proto messages (compatible with v1 API)
function create<T extends Message<T>>(MessageClass: new (data?: any) => T, data?: any): T {
    return new MessageClass(data);
}
import type { JWTPayload } from '../../auth/jwt';
import {
    getBejisForUser,
    getWorld as getWorldFromRedis,
} from '../../redis/gameState';

// Context key for authentication
export const AUTH_CONTEXT_KEY = createContextKey<JWTPayload | undefined>(undefined, {
    description: 'auth',
});

function convertBejiToProto(beji: BejiType) {
    return create(Beji, {
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
    });
}

function convertWorldToSummary(world: WorldType | null): WorldSummary | null {
    if (!world) return null;
    return create(WorldSummary, {
        id: world.id,
        mainBejiId: world.mainBejiId,
        createdAt: protoInt64.parse(world.createdAt.toString()),
    });
}

export function registerPlayerService(router: ConnectRouter) {
    router.service(
        PlayerService,
        {
            async getUserBejis(req: GetUserBejisRequest, context: HandlerContext): Promise<GetUserBejisResponse> {
                try {
                    const authPayload = context.values.get(AUTH_CONTEXT_KEY) as JWTPayload | undefined;

                    if (!authPayload) {
                        console.error('[PlayerService.getUserBejis] Unauthorized: No auth payload in context');
                        throw new Error('Unauthorized');
                    }

                    if (req.userId !== authPayload.userId) {
                        console.error('[PlayerService.getUserBejis] Forbidden: User ID mismatch', {
                            requestedUserId: req.userId,
                            authUserId: authPayload.userId,
                        });
                        throw new Error('Forbidden');
                    }

                    // Get all bejis for this user (across all their players)
                    const bejis = await getBejisForUser(req.userId);
                    
                    if (bejis.length === 0) {
                        console.log('[PlayerService.getUserBejis] No bejis found for user:', req.userId);
                        return create(GetUserBejisResponse, { bejis: [] });
                    }
                    const bejisWithWorlds = await Promise.all(
                        bejis.map(async (beji) => {
                            try {
                                const world = beji.worldId ? await getWorldFromRedis(beji.worldId) : null;
                                return create(BejiWithWorld, {
                                    beji: convertBejiToProto(beji),
                                    world: convertWorldToSummary(world),
                                });
                            } catch (error) {
                                console.error('[PlayerService.getUserBejis] Error processing beji:', beji.id, error);
                                throw error;
                            }
                        })
                    );

                    return create(GetUserBejisResponse, { bejis: bejisWithWorlds });
                } catch (error) {
                    console.error('[PlayerService.getUserBejis] Error:', error, { userId: req.userId });
                    throw error;
                }
            },
        }
    );
}

