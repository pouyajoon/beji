import { createClient } from '@connectrpc/connect';
import { PlayerService } from '../../proto/player/v1/player_connect';
import {
    GetUserBejisRequest,
    GetUserBejisResponse,
} from '../../proto/player/v1/player_pb';
import { transport } from './transport';

const client = createClient(PlayerService, transport);

export async function getUserBejis(
    userId: string
): Promise<GetUserBejisResponse> {
    const request = new GetUserBejisRequest({
        userId,
    });

    // Direct access is safe here - we know getUserBejis exists
    return await client.getUserBejis(request);
}
