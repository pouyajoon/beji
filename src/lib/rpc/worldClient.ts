import {
    CreateWorldRequest,
    CreateWorldResponse,
    GetWorldRequest,
    GetWorldResponse,
} from "../../proto/world/v1/world";

const RPC_BASE_URL = "/api/rpc/world/v1";

async function callRPC<TRequest, TResponse>(
    method: string,
    request: TRequest
): Promise<TResponse> {
    const response = await fetch(RPC_BASE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            method,
            params: request,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `RPC call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data as TResponse;
}

export async function createWorld(
    bejiName: string,
    emojiCodepoints: number[]
): Promise<CreateWorldResponse> {
    const request: CreateWorldRequest = {
        bejiName,
        emojiCodepoints,
    };
    
    const response = await callRPC<CreateWorldRequest, CreateWorldResponse>(
        "CreateWorld",
        request
    );
    
    return CreateWorldResponse.fromJSON(response);
}

export async function getWorld(worldId: string): Promise<GetWorldResponse> {
    const request: GetWorldRequest = {
        worldId,
    };
    
    const response = await callRPC<GetWorldRequest, GetWorldResponse>(
        "GetWorld",
        request
    );
    
    return GetWorldResponse.fromJSON(response);
}

