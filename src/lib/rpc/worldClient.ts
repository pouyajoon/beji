import { createClient } from '@connectrpc/connect';
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

const client = createClient(WorldService as any, transport);

export async function createWorld(
    bejiName: string,
    emojiCodepoints: number[]
): Promise<CreateWorldResponse> {
    const request = create(CreateWorldRequestSchema, {
        bejiName,
        emojiCodepoints,
    });

    const response = await (client as any).createWorld(request);
    return response as CreateWorldResponse;
}

export async function getWorld(worldId: string): Promise<GetWorldResponse> {
    const request = create(GetWorldRequestSchema, {
        worldId,
    });

    const response = await (client as any).getWorld(request);
    return response as GetWorldResponse;
}
