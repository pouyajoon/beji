const RPC_BASE_URL = "/api/rpc/config/v1";

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
        let errorMessage = `RPC call failed: ${response.statusText}`;
        try {
            const error = await response.json();
            errorMessage = error?.error || errorMessage;
        } catch {
            // Response body is not JSON or is empty, use default error message
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as TResponse;
}

export interface PublicConfig {
    googleClientId: string;
}

export async function getPublicConfig(): Promise<PublicConfig> {
    const request = {};

    const response = await callRPC<typeof request, PublicConfig>(
        "GetPublicConfig",
        request
    );

    return response;
}

