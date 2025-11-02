import { NextRequest, NextResponse } from "next/server";
import {
    GetPublicConfigRequest,
    GetPublicConfigResponse,
} from "../../../../../src/proto/config/v1/config_pb";

export const dynamic = "force-dynamic";

// Helper function to get env vars at runtime only
function getEnvVar(key: string): string | undefined {
    return process.env[key];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const method = body.method as string;
        const params = body.params;

        if (method === "GetPublicConfig") {
            const req = GetPublicConfigRequest.fromJson(params);

            const googleClientId = getEnvVar("GOOGLE_CLIENT_ID");

            if (!googleClientId) {
                return NextResponse.json(
                    { error: "Google Client ID not configured" },
                    { status: 500 }
                );
            }

            const response = new GetPublicConfigResponse({
                googleClientId,
            });

            return NextResponse.json(response.toJson());
        } else {
            return NextResponse.json(
                { error: `Unknown method: ${method}` },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error in config RPC handler:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

