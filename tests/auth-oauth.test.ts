import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing routes
vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

const mockSignJWT = vi.fn();
const mockVerifyJWT = vi.fn();

vi.mock("../src/lib/auth/jwt", () => ({
    signJWT: (...args: any[]) => mockSignJWT(...args),
    verifyJWT: (...args: any[]) => mockVerifyJWT(...args),
}));

// Import routes after mocking
const { GET: oauthCallbackGET } = await import("../app/api/authentication/oauth/google/route");
const { GET: getTokenGET } = await import("../app/api/authentication/get-token/route");
const { cookies } = await import("next/headers");

describe("Google OAuth Authentication", () => {
    const originalEnv = process.env;
    const mockCookieStore = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            GOOGLE_CLIENT_ID: "test-client-id",
            GOOGLE_CLIENT_SECRET: "test-client-secret",
            JWT_SECRET: "test-jwt-secret",
            NODE_ENV: "test",
        };
        vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
        global.fetch = vi.fn();
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe("OAuth Callback Route", () => {
        test("redirects on OAuth error", async () => {
            const url = new URL("http://localhost:3000/authentication/oauth/google?error=access_denied");
            const request = new NextRequest(url);

            const response = await oauthCallbackGET(request);

            expect(response.status).toBe(307);
            const redirectUrl = new URL(response.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/");
            expect(redirectUrl.searchParams.get("error")).toBe("oauth_failed");
        });

        test("redirects when authorization code is missing", async () => {
            const url = new URL("http://localhost:3000/authentication/oauth/google");
            const request = new NextRequest(url);

            const response = await oauthCallbackGET(request);

            expect(response.status).toBe(307);
            const redirectUrl = new URL(response.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/");
            expect(redirectUrl.searchParams.get("error")).toBe("no_code");
        });

        test("redirects when token exchange fails", async () => {
            const url = new URL("http://localhost:3000/authentication/oauth/google?code=test-code");
            const request = new NextRequest(url);

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: false,
                text: async () => "Invalid code",
            } as Response);

            const response = await oauthCallbackGET(request);

            expect(response.status).toBe(307);
            const redirectUrl = new URL(response.headers.get("location")!);
            expect(redirectUrl.searchParams.get("error")).toBe("token_exchange_failed");
            expect(global.fetch).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                expect.objectContaining({
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                })
            );
        });

        test("redirects when access token is missing in response", async () => {
            const url = new URL("http://localhost:3000/authentication/oauth/google?code=test-code");
            const request = new NextRequest(url);

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id_token: "test-id-token" }),
            } as Response);

            const response = await oauthCallbackGET(request);

            expect(response.status).toBe(307);
            const redirectUrl = new URL(response.headers.get("location")!);
            expect(redirectUrl.searchParams.get("error")).toBe("no_access_token");
        });

        test("redirects when user info fetch fails", async () => {
            const url = new URL("http://localhost:3000/authentication/oauth/google?code=test-code");
            const request = new NextRequest(url);

            vi.mocked(global.fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        access_token: "test-access-token",
                        id_token: "test-id-token",
                    }),
                } as Response)
                .mockResolvedValueOnce({
                    ok: false,
                } as Response);

            const response = await oauthCallbackGET(request);

            expect(response.status).toBe(307);
            const redirectUrl = new URL(response.headers.get("location")!);
            expect(redirectUrl.searchParams.get("error")).toBe("userinfo_failed");
        });

        test("successfully completes OAuth flow and sets cookie", async () => {
            const url = new URL("http://localhost:3000/authentication/oauth/google?code=test-code");
            const request = new NextRequest(url);

            const mockUserInfo = {
                id: "google-user-123",
                email: "user@example.com",
                name: "Test User",
            };

            const mockJWT = "mock-jwt-token";

            vi.mocked(global.fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        access_token: "test-access-token",
                        id_token: "test-id-token",
                    }),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockUserInfo,
                } as Response);

            mockSignJWT.mockResolvedValueOnce(mockJWT);

            const response = await oauthCallbackGET(request);

            // Verify token exchange
            expect(global.fetch).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                expect.objectContaining({
                    method: "POST",
                })
            );
            // Verify the body contains the code
            const fetchCalls = vi.mocked(global.fetch).mock.calls;
            const tokenExchangeCall = fetchCalls.find(
                (call) => call[0] === "https://oauth2.googleapis.com/token"
            );
            expect(tokenExchangeCall).toBeDefined();
            const body = tokenExchangeCall![1]?.body as URLSearchParams | string;
            const bodyString = body instanceof URLSearchParams ? body.toString() : String(body);
            expect(bodyString).toContain("code=test-code");

            // Verify user info fetch
            expect(global.fetch).toHaveBeenCalledWith(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer test-access-token",
                    }),
                })
            );

            // Verify JWT creation
            expect(mockSignJWT).toHaveBeenCalledWith({
                userId: mockUserInfo.id,
                email: mockUserInfo.email,
            });

            // Verify cookie is set
            expect(mockCookieStore.set).toHaveBeenCalledWith(
                "auth_token",
                mockJWT,
                expect.objectContaining({
                    httpOnly: true,
                    secure: false, // NODE_ENV is 'test', not 'production'
                    sameSite: "strict",
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                })
            );

            // Verify redirect to /en
            expect(response.status).toBe(307);
            const redirectUrl = new URL(response.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/en");
        });

        test("sets secure cookie in production", async () => {
            // Use Object.defineProperty to set NODE_ENV for testing
            Object.defineProperty(process.env, "NODE_ENV", {
                value: "production",
                writable: true,
                configurable: true,
            });
            const url = new URL("http://localhost:3000/authentication/oauth/google?code=test-code");
            const request = new NextRequest(url);

            const mockUserInfo = {
                id: "google-user-123",
                email: "user@example.com",
            };

            vi.mocked(global.fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        access_token: "test-access-token",
                        id_token: "test-id-token",
                    }),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockUserInfo,
                } as Response);

            mockSignJWT.mockResolvedValueOnce("mock-jwt-token");

            await oauthCallbackGET(request);

            expect(mockCookieStore.set).toHaveBeenCalledWith(
                "auth_token",
                expect.any(String),
                expect.objectContaining({
                    secure: true,
                })
            );
        });

        test("handles callback errors gracefully", async () => {
            const url = new URL("http://localhost:3000/authentication/oauth/google?code=test-code");
            const request = new NextRequest(url);

            vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

            const response = await oauthCallbackGET(request);

            expect(response.status).toBe(307);
            const redirectUrl = new URL(response.headers.get("location")!);
            expect(redirectUrl.searchParams.get("error")).toBe("callback_error");
        });

        test("uses correct redirect URI", async () => {
            const url = new URL("https://example.com/authentication/oauth/google?code=test-code");
            const request = new NextRequest(url);

            vi.mocked(global.fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        access_token: "test-access-token",
                        id_token: "test-id-token",
                    }),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        id: "google-user-123",
                        email: "user@example.com",
                    }),
                } as Response);

            mockSignJWT.mockResolvedValueOnce("mock-jwt-token");

            await oauthCallbackGET(request);

            // Find the token exchange call
            const fetchCalls = vi.mocked(global.fetch).mock.calls;
            const tokenExchangeCall = fetchCalls.find(
                (call) => call[0] === "https://oauth2.googleapis.com/token"
            );
            expect(tokenExchangeCall).toBeDefined();
            const body = tokenExchangeCall![1]?.body as URLSearchParams | string;
            const bodyString = body instanceof URLSearchParams ? body.toString() : String(body);
            const redirectUriMatch = bodyString.match(/redirect_uri=([^&]+)/);
            const redirectUri = redirectUriMatch && redirectUriMatch[1] 
                ? decodeURIComponent(redirectUriMatch[1]) 
                : undefined;

            expect(redirectUri).toBeDefined();
            if (redirectUri) {
                expect(redirectUri).toBe("https://example.com/authentication/oauth/google");
            }
        });
    });

    describe("Get Token Route", () => {
        test("returns 401 when no token cookie exists", async () => {
            const url = new URL("http://localhost:3000/api/authentication/get-token");
            const request = new NextRequest(url);

            mockCookieStore.get.mockReturnValueOnce(undefined);

            const response = await getTokenGET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data).toEqual({ error: "Unauthorized" });
            expect(mockVerifyJWT).not.toHaveBeenCalled();
        });

        test("returns user info when token is valid", async () => {
            const url = new URL("http://localhost:3000/api/authentication/get-token");
            const request = new NextRequest(url);

            const mockToken = "valid-jwt-token";
            const mockPayload = {
                userId: "google-user-123",
                email: "user@example.com",
            };

            mockCookieStore.get.mockReturnValueOnce({ value: mockToken });
            mockVerifyJWT.mockResolvedValueOnce(mockPayload as any);

            const response = await getTokenGET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockPayload);
            expect(mockVerifyJWT).toHaveBeenCalledWith(mockToken);
        });

        test("returns 401 and deletes cookie when token is invalid", async () => {
            const url = new URL("http://localhost:3000/api/authentication/get-token");
            const request = new NextRequest(url);

            const mockToken = "invalid-jwt-token";

            mockCookieStore.get.mockReturnValueOnce({ value: mockToken });
            mockVerifyJWT.mockRejectedValueOnce(new Error("Invalid token"));

            const response = await getTokenGET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data).toEqual({ error: "Invalid token" });
            expect(mockCookieStore.delete).toHaveBeenCalledWith("auth_token");
        });

        test("returns 401 and deletes cookie when token is expired", async () => {
            const url = new URL("http://localhost:3000/api/authentication/get-token");
            const request = new NextRequest(url);

            const mockToken = "expired-jwt-token";

            mockCookieStore.get.mockReturnValueOnce({ value: mockToken });
            mockVerifyJWT.mockRejectedValueOnce(new Error("Token expired"));

            const response = await getTokenGET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data).toEqual({ error: "Invalid token" });
            expect(mockCookieStore.delete).toHaveBeenCalledWith("auth_token");
        });
    });
});

