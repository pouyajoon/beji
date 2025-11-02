import { PlayerService } from '../../proto/player/v1/player_connect';
import type {
    GetUserBejisRequest,
    GetUserBejisResponse,
} from '../../proto/player/v1/player_pb';
import { create } from '@bufbuild/protobuf';
import { GetUserBejisRequestSchema } from '../../proto/player/v1/player_pb';
import { transport } from './transport';
import { createServiceClient } from './clientHelpers';

const client = createServiceClient(PlayerService, transport);

export async function getUserBejis(
    userId: string
): Promise<GetUserBejisResponse> {
    const request = create(GetUserBejisRequestSchema, {
        userId,
    });

    // Type assertion is safe here - we know getUserBejis exists and returns GetUserBejisResponse
    const method = (client as Record<string, (req: GetUserBejisRequest) => Promise<GetUserBejisResponse>>).getUserBejis;
    if (!method) {
        throw new Error('getUserBejis method not found on PlayerService client');
    }
    
    return await method(request);
}
