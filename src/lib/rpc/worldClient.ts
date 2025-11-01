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
): Promise<any> {
    const request = {
        bejiName,
        emojiCodepoints,
    };

    const response = await callRPC<any, any>(
        "CreateWorld",
        request
    );

    return response;
}

export async function getWorld(worldId: string): Promise<any> {
    const request = {
        worldId,
    };

    const response = await callRPC<any, any>(
        "GetWorld",
        request
    );

    console.log("response", response);
    return response;
}

