import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockVerifyJWT = vi.fn();

vi.mock("../src/lib/auth/jwt", () => ({
    verifyJWT: (...args: any[]) => mockVerifyJWT(...args),
}));

// Import middleware after mocking
let middleware: (request: NextRequest) => Promise<NextResponse | Response>;

describe("Authentication Middleware", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Dynamically import middleware to ensure mocks are applied
        vi.resetModules();
    });

    test("allows access when valid JWT token exists in cookie", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const mockPayload = {
            userId: "test-user-123",
            email: "test@example.com",
        };

        mockVerifyJWT.mockResolvedValueOnce(mockPayload);

        const request = new NextRequest("http://localhost:3000/", {
            headers: {
                cookie: "auth_token=valid-jwt-token",
            },
        });

        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(mockVerifyJWT).toHaveBeenCalledWith("valid-jwt-token");
        // Should allow request to proceed (not redirect)
        expect(response.status).not.toBe(307);
    });

    test("redirects to login when no auth token cookie exists", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const request = new NextRequest("http://localhost:3000/");

        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("redirects to login when JWT token is invalid", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        mockVerifyJWT.mockRejectedValueOnce(new Error("Invalid token"));

        const request = new NextRequest("http://localhost:3000/", {
            headers: {
                cookie: "auth_token=invalid-token",
            },
        });

        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
        expect(mockVerifyJWT).toHaveBeenCalledWith("invalid-token");
    });

    test("allows access to login page without authentication", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const request = new NextRequest("http://localhost:3000/login");

        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        // Should allow access (not redirect)
        expect(response.status).not.toBe(307);
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("allows access to authentication routes without authentication", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const request = new NextRequest("http://localhost:3000/authentication/oauth/get-token");

        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        // Should allow access (not redirect)
        expect(response.status).not.toBe(307);
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("allows access to OAuth callback route without authentication", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const request = new NextRequest("http://localhost:3000/authentication/oauth/google?code=test");

        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        // Should allow access (not redirect)
        expect(response.status).not.toBe(307);
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("allows access to static assets without authentication", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const staticPaths = [
            "/_next/static/css/app.css",
            "/_next/image",
            "/favicon.ico",
            "/_next/static/chunks/main.js",
        ];

        for (const path of staticPaths) {
            const request = new NextRequest(`http://localhost:3000${path}`);
            const response = await middleware(request);

            expect(response).toBeInstanceOf(NextResponse);
            expect(response.status).not.toBe(307);
        }

        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("requires authentication for protected routes", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const protectedRoutes = [
            "/",
            "/world/123",
            "/emoji",
        ];

        for (const route of protectedRoutes) {
            mockVerifyJWT.mockClear();
            const request = new NextRequest(`http://localhost:3000${route}`);
            const response = await middleware(request);

            expect(response.status).toBe(307);
            const location = response.headers.get("location");
            expect(location).toBe("http://localhost:3000/login");
        }
    });

    test("preserves query parameters when redirecting to login", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        const request = new NextRequest("http://localhost:3000/world/123?foo=bar&baz=qux");

        const response = await middleware(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
    });

    test("allows access when token is valid but expired", async () => {
        const { middleware: middlewareFn } = await import("../middleware");
        middleware = middlewareFn;

        mockVerifyJWT.mockRejectedValueOnce(new Error("Token expired"));

        const request = new NextRequest("http://localhost:3000/", {
            headers: {
                cookie: "auth_token=expired-token",
            },
        });

        const response = await middleware(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
        expect(mockVerifyJWT).toHaveBeenCalledWith("expired-token");
    });
});

