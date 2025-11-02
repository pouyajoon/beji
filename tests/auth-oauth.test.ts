import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createTestFastifyWithRoutes } from './helpers/fastify-routes';

const mockSignJWT = vi.fn();
const mockVerifyJWT = vi.fn();

vi.mock("../src/lib/auth/jwt", () => ({
    signJWT: (...args: any[]) => mockSignJWT(...args),
    verifyJWT: (...args: any[]) => mockVerifyJWT(...args),
}));

describe("Google OAuth Authentication", () => {
    const originalEnv = process.env;
    let fastify: Awaited<ReturnType<typeof createTestFastifyWithRoutes>>;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            GOOGLE_CLIENT_ID: "test-client-id",
            GOOGLE_CLIENT_SECRET: "test-client-secret",
            JWT_SECRET: "test-jwt-secret",
            NODE_ENV: "test",
        };
        global.fetch = vi.fn();

        return createTestFastifyWithRoutes().then(f => {
            fastify = f;
            return fastify.ready();
        });
    });

    afterEach(async () => {
        process.env = originalEnv;
        vi.restoreAllMocks();
        if (fastify) {
            await fastify.close();
        }
    });

    describe("OAuth Callback Route", () => {
        test("redirects on OAuth error", async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?error=access_denied',
                headers: {
                    host: 'localhost:3000',
                },
            });

            expect(response.statusCode).toBe(302);
            const location = response.headers.location!;
            const redirectUrl = location.startsWith('http') ? new URL(location) : new URL(location, 'http://localhost:3000');
            expect(redirectUrl.pathname).toBe("/");
            expect(redirectUrl.searchParams.get("error")).toBe("oauth_failed");
        });

        test("redirects when authorization code is missing", async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google',
                headers: {
                    host: 'localhost:3000',
                },
            });

            expect(response.statusCode).toBe(302);
            const location = response.headers.location!;
            const redirectUrl = location.startsWith('http') ? new URL(location) : new URL(location, 'http://localhost:3000');
            expect(redirectUrl.pathname).toBe("/");
            expect(redirectUrl.searchParams.get("error")).toBe("no_code");
        });

        test("redirects when token exchange fails", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: false,
                text: async () => "Invalid code",
            } as Response);

            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?code=test-code',
                headers: {
                    host: 'localhost:3000',
                },
            });

            expect(response.statusCode).toBe(302);
            const location = response.headers.location!;
            const redirectUrl = location.startsWith('http') ? new URL(location) : new URL(location, 'http://localhost:3000');
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
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id_token: "test-id-token" }),
            } as Response);

            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?code=test-code',
                headers: {
                    host: 'localhost:3000',
                },
            });

            expect(response.statusCode).toBe(302);
            const location = response.headers.location!;
            const redirectUrl = location.startsWith('http') ? new URL(location) : new URL(location, 'http://localhost:3000');
            expect(redirectUrl.searchParams.get("error")).toBe("no_access_token");
        });

        test("redirects when user info fetch fails", async () => {
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

            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?code=test-code',
                headers: {
                    host: 'localhost:3000',
                },
            });

            expect(response.statusCode).toBe(302);
            const location = response.headers.location!;
            const redirectUrl = location.startsWith('http') ? new URL(location) : new URL(location, 'http://localhost:3000');
            expect(redirectUrl.searchParams.get("error")).toBe("userinfo_failed");
        });

        test("successfully completes OAuth flow and sets cookie", async () => {
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

            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?code=test-code',
                headers: {
                    host: 'localhost:3000',
                },
            });

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

            // Verify redirect to /en
            expect(response.statusCode).toBe(302);
            const location = response.headers.location!;
            const redirectUrl = location.startsWith('http') ? new URL(location) : new URL(location, 'http://localhost:3000');
            expect(redirectUrl.pathname).toBe("/en");

            // Verify cookie is set in response headers
            const setCookieHeader = response.headers['set-cookie'];
            expect(setCookieHeader).toBeDefined();
            if (Array.isArray(setCookieHeader)) {
                expect(setCookieHeader[0]).toContain("auth_token=mock-jwt-token");
            } else if (setCookieHeader) {
                expect(setCookieHeader).toContain("auth_token=mock-jwt-token");
            }
        });

        test("sets secure cookie in production", async () => {
            process.env.NODE_ENV = "production";

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

            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?code=test-code',
                headers: {
                    host: 'localhost:3000',
                },
            });

            const setCookieHeader = response.headers['set-cookie'];
            expect(setCookieHeader).toBeDefined();
            const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
            expect(cookieString).toContain("Secure");
        });

        test("handles callback errors gracefully", async () => {
            vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?code=test-code',
                headers: {
                    host: 'localhost:3000',
                },
            });

            expect(response.statusCode).toBe(302);
            const location = response.headers.location!;
            const redirectUrl = location.startsWith('http') ? new URL(location) : new URL(location, 'http://localhost:3000');
            expect(redirectUrl.searchParams.get("error")).toBe("callback_error");
        });

        test("uses correct redirect URI", async () => {
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

            const response = await fastify.inject({
                method: 'GET',
                url: '/authentication/oauth/google?code=test-code',
                headers: {
                    host: 'example.com',
                    origin: 'https://example.com',
                    'x-forwarded-proto': 'https',
                },
            });

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
                expect(redirectUri).toContain("example.com/authentication/oauth/google");
            }
        });
    });

    describe("Get Token Route", () => {
        test("returns 401 when no token cookie exists", async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/authentication/get-token',
                headers: {
                    cookie: '', // No auth token
                },
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(401);
            expect(data).toEqual({ error: "Unauthorized" });
            expect(mockVerifyJWT).not.toHaveBeenCalled();
        });

        test("returns user info when token is valid", async () => {
            const mockToken = "valid-jwt-token";
            const mockPayload = {
                userId: "google-user-123",
                email: "user@example.com",
            };

            mockVerifyJWT.mockResolvedValueOnce(mockPayload);

            const response = await fastify.inject({
                method: 'GET',
                url: '/api/authentication/get-token',
                headers: {
                    cookie: `auth_token=${mockToken}`,
                },
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(200);
            expect(data).toEqual(mockPayload);
            expect(mockVerifyJWT).toHaveBeenCalledWith(mockToken);
        });

        test("returns 401 when token is invalid", async () => {
            const mockToken = "invalid-jwt-token";

            mockVerifyJWT.mockRejectedValueOnce(new Error("Invalid token"));

            const response = await fastify.inject({
                method: 'GET',
                url: '/api/authentication/get-token',
                headers: {
                    cookie: `auth_token=${mockToken}`,
                },
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(401);
            expect(data).toEqual({ error: "Unauthorized" });
        });

        test("returns 401 when token is expired", async () => {
            const mockToken = "expired-jwt-token";

            mockVerifyJWT.mockRejectedValueOnce(new Error("Token expired"));

            const response = await fastify.inject({
                method: 'GET',
                url: '/api/authentication/get-token',
                headers: {
                    cookie: `auth_token=${mockToken}`,
                },
            });

            const data = JSON.parse(response.body);

            expect(response.statusCode).toBe(401);
            expect(data).toEqual({ error: "Unauthorized" });
        });
    });
});
