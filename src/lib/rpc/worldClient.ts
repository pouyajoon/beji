import { createClient } from '@connectrpc/connect';
import type { DescService } from '@bufbuild/protobuf';
import { WorldService } from '../../proto/world/v1/world_connect';
import {
    CreateWorldRequest,
    CreateWorldResponse,
    GetWorldRequest,
    GetWorldResponse,
} from '../../proto/world/v1/world_pb';
import { transport } from './transport';

const client = createClient(WorldService as unknown as DescService, transport);

export async function createWorld(
    bejiName: string,
    emojiCodepoints: number[]
): Promise<CreateWorldResponse> {
    const request = new CreateWorldRequest({
        bejiName,
        emojiCodepoints,
    });

    // Type assertion is safe here - we know createWorld exists and returns CreateWorldResponse
    const method = (client as Record<string, (req: CreateWorldRequest) => Promise<CreateWorldResponse>>).createWorld;
    if (!method) {
        throw new Error('createWorld method not found on WorldService client');
    }
    
    return await method(request);
}

export async function getWorld(worldId: string): Promise<GetWorldResponse> {
    const request = new GetWorldRequest({
        worldId,
    });

    // Type assertion is safe here - we know getWorld exists and returns GetWorldResponse
    const method = (client as Record<string, (req: GetWorldRequest) => Promise<GetWorldResponse>>).getWorld;
    if (!method) {
        throw new Error('getWorld method not found on WorldService client');
    }
    
    return await method(request);
}
