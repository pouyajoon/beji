import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "../../../../src/lib/auth/jwt";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    // If no token, return unauthorized
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Verify existing token
        const payload = await verifyJWT(token.value);

        // Return user info from token
        return NextResponse.json({
            userId: payload.userId,
            email: payload.email,
            picture: payload.picture,
        });
    } catch (error) {
        // Token is invalid or expired, remove it
        cookieStore.delete("auth_token");
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
}

