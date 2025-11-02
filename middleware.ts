import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./src/lib/auth/jwt";

/**
 * Authentication middleware that protects all routes except:
 * - /login
 * - /authentication/* (all authentication routes, including OAuth)
 * - Static assets (_next/*, favicon.ico, etc.)
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow access to login page
    if (pathname === "/login") {
        return NextResponse.next();
    }

    // Allow access to all authentication routes (no JWT required)
    if (pathname.startsWith("/authentication/")) {
        return NextResponse.next();
    }

    // Allow access to static assets and Next.js internals
    if (
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/static/") ||
        pathname === "/favicon.ico" ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
    ) {
        return NextResponse.next();
    }

    // Check for auth token in cookies
    const authToken = request.cookies.get("auth_token");

    if (!authToken) {
        // No token, redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        // Verify JWT token
        await verifyJWT(authToken.value);
        // Token is valid, allow request to proceed
        return NextResponse.next();
    } catch (error) {
        // Token is invalid or expired, redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
    }
}

/**
 * Configure which routes this middleware should run on
 * Matches all routes - the middleware function handles exclusions
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Note: We match API routes too, and handle exclusions in the middleware function
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};

