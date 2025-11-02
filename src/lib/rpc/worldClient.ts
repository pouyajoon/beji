import { WorldService } from '../../proto/world/v1/world_connect';
import type {
    CreateWorldRequest,
    CreateWorldResponse,
    GetWorldRequest,
    GetWorldResponse,
} from '../../proto/world/v1/world_pb';
import { create } from '@bufbuild/protobuf';
import {
    CreateWorldRequestSchema,
    GetWorldRequestSchema,
} from '../../proto/world/v1/world_pb';
import { transport } from './transport';
import { createServiceClient } from './clientHelpers';

const client = createServiceClient(WorldService, transport);

export async function createWorld(
    bejiName: string,
    emojiCodepoints: number[]
): Promise<CreateWorldResponse> {
    const request = create(CreateWorldRequestSchema, {
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
    const request = create(GetWorldRequestSchema, {
        worldId,
    });

    // Type assertion is safe here - we know getWorld exists and returns GetWorldResponse
    const method = (client as Record<string, (req: GetWorldRequest) => Promise<GetWorldResponse>>).getWorld;
    if (!method) {
        throw new Error('getWorld method not found on WorldService client');
    }
    
    return await method(request);
}
