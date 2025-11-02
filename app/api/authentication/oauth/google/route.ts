import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signJWT } from "../../../../../src/lib/auth/jwt";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
        console.error("OAuth error:", error);
        return NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
    }

    // Handle missing authorization code
    if (!code) {
        console.error("No authorization code provided");
        return NextResponse.redirect(new URL("/?error=no_code", request.url));
    }

    try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${request.nextUrl.origin}/authentication/oauth/google`,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Token exchange failed:", errorText);
            return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
        }

        const tokenData = await tokenResponse.json();
        const { access_token, id_token } = tokenData;

        if (!access_token) {
            console.error("No access token in response");
            return NextResponse.redirect(new URL("/?error=no_access_token", request.url));
        }

        // Fetch user info from Google
        const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        if (!userInfoResponse.ok) {
            console.error("Failed to fetch user info");
            return NextResponse.redirect(new URL("/?error=userinfo_failed", request.url));
        }

        const userInfo = await userInfoResponse.json();

        // Create JWT token
        const jwt = await signJWT({
            userId: userInfo.id,
            email: userInfo.email,
        });

        // Store JWT token in secure cookie
        const cookieStore = await cookies();
        cookieStore.set("auth_token", jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Redirect to the game
        return NextResponse.redirect(new URL("/en", request.url));
    } catch (error) {
        console.error("OAuth callback error:", error);
        return NextResponse.redirect(new URL("/?error=callback_error", request.url));
    }
}

