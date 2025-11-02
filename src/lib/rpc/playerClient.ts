import { createClient } from '@connectrpc/connect';
import type { DescService } from '@bufbuild/protobuf';
import { PlayerService } from '../../proto/player/v1/player_connect';
import {
    GetUserBejisRequest,
    GetUserBejisResponse,
} from '../../proto/player/v1/player_pb';
import { transport } from './transport';

const client = createClient(PlayerService as unknown as DescService, transport);

export async function getUserBejis(
    userId: string
): Promise<GetUserBejisResponse> {
    const request = new GetUserBejisRequest({
        userId,
    });

    // Type assertion is safe here - we know getUserBejis exists and returns GetUserBejisResponse
    const method = (client as Record<string, (req: GetUserBejisRequest) => Promise<GetUserBejisResponse>>).getUserBejis;
    if (!method) {
        throw new Error('getUserBejis method not found on PlayerService client');
    }
    
    return await method(request);
}
