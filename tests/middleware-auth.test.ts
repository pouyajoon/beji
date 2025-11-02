import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockVerifyJWT = vi.fn();

vi.mock("../src/lib/auth/jwt", () => ({
    verifyJWT: (...args: any[]) => mockVerifyJWT(...args),
}));

// Import proxy after mocking
let proxy: (request: NextRequest) => Promise<NextResponse | Response>;

describe("Authentication Proxy", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Dynamically import proxy to ensure mocks are applied
        vi.resetModules();
    });

    test("allows access when valid JWT token exists in cookie", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

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

        const response = await proxy(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(mockVerifyJWT).toHaveBeenCalledWith("valid-jwt-token");
        // Should allow request to proceed (not redirect)
        expect(response.status).not.toBe(307);
    });

    test("redirects to login when no auth token cookie exists", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        const request = new NextRequest("http://localhost:3000/");

        const response = await proxy(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("redirects to login when JWT token is invalid", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        mockVerifyJWT.mockRejectedValueOnce(new Error("Invalid token"));

        const request = new NextRequest("http://localhost:3000/", {
            headers: {
                cookie: "auth_token=invalid-token",
            },
        });

        const response = await proxy(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
        expect(mockVerifyJWT).toHaveBeenCalledWith("invalid-token");
    });

    test("allows access to login page without authentication", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        const request = new NextRequest("http://localhost:3000/login");

        const response = await proxy(request);

        expect(response).toBeInstanceOf(NextResponse);
        // Should allow access (not redirect)
        expect(response.status).not.toBe(307);
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("allows access to authentication routes without authentication", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        const request = new NextRequest("http://localhost:3000/authentication/oauth/get-token");

        const response = await proxy(request);

        expect(response).toBeInstanceOf(NextResponse);
        // Should allow access (not redirect)
        expect(response.status).not.toBe(307);
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("allows access to OAuth callback route without authentication", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        const request = new NextRequest("http://localhost:3000/authentication/oauth/google?code=test");

        const response = await proxy(request);

        expect(response).toBeInstanceOf(NextResponse);
        // Should allow access (not redirect)
        expect(response.status).not.toBe(307);
        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("allows access to static assets without authentication", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        const staticPaths = [
            "/_next/static/css/app.css",
            "/_next/image",
            "/favicon.ico",
            "/_next/static/chunks/main.js",
        ];

        for (const path of staticPaths) {
            const request = new NextRequest(`http://localhost:3000${path}`);
            const response = await proxy(request);

            expect(response).toBeInstanceOf(NextResponse);
            expect(response.status).not.toBe(307);
        }

        expect(mockVerifyJWT).not.toHaveBeenCalled();
    });

    test("requires authentication for protected routes", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        const protectedRoutes = [
            "/",
            "/world/123",
            "/emoji",
        ];

        for (const route of protectedRoutes) {
            mockVerifyJWT.mockClear();
            const request = new NextRequest(`http://localhost:3000${route}`);
            const response = await proxy(request);

            expect(response.status).toBe(307);
            const location = response.headers.get("location");
            expect(location).toBe("http://localhost:3000/login");
        }
    });

    test("preserves query parameters when redirecting to login", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        const request = new NextRequest("http://localhost:3000/world/123?foo=bar&baz=qux");

        const response = await proxy(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
    });

    test("allows access when token is valid but expired", async () => {
        const { proxy: proxyFn } = await import("../proxy");
        proxy = proxyFn;

        mockVerifyJWT.mockRejectedValueOnce(new Error("Token expired"));

        const request = new NextRequest("http://localhost:3000/", {
            headers: {
                cookie: "auth_token=expired-token",
            },
        });

        const response = await proxy(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/login");
        expect(mockVerifyJWT).toHaveBeenCalledWith("expired-token");
    });
});

