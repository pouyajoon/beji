import { createClient } from '@connectrpc/connect';
import { WorldService } from '../../proto/world/v1/world_connect';
import {
    CreateWorldRequest,
    CreateWorldResponse,
    GetWorldRequest,
    GetWorldResponse,
} from '../../proto/world/v1/world_pb';
import { transport } from './transport';

const client = createClient(WorldService, transport);

export async function createWorld(
    bejiName: string,
    emojiCodepoints: number[]
): Promise<CreateWorldResponse> {
    const request = new CreateWorldRequest({
        bejiName,
        emojiCodepoints,
    });

    // Direct access is safe here - we know createWorld exists
    return await client.createWorld(request);
}

export async function getWorld(worldId: string): Promise<GetWorldResponse> {
    const request = new GetWorldRequest({
        worldId,
    });

    // Direct access is safe here - we know getWorld exists
    return await client.getWorld(request);
}
