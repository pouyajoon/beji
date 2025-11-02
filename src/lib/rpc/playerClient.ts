import { createClient } from '@connectrpc/connect';
import { PlayerService } from '../../proto/player/v1/player_connect';
import type {
    GetUserBejisResponse,
} from '../../proto/player/v1/player_pb';
import { create } from '@bufbuild/protobuf';
import { GetUserBejisRequestSchema } from '../../proto/player/v1/player_pb';
import { transport } from './transport';

const client = createClient(PlayerService as any, transport);

export async function getUserBejis(
    userId: string
): Promise<GetUserBejisResponse> {
    const request = create(GetUserBejisRequestSchema, {
        userId,
    });

    const response = await (client as any).getUserBejis(request);
    return response as GetUserBejisResponse;
}
