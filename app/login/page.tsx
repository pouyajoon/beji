"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSetAtom } from "../../lib/jotai";
import { userSubAtom } from "../../components/atoms";

export default function LoginPage() {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const setUserSub = useSetAtom(userSubAtom);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        // Check if user is already authenticated by verifying token
        async function checkAuth() {
            try {
                const response = await fetch("/api/authentication/get-token");
                if (response.ok) {
                    const data = await response.json();
                    setUserSub(data.userId);
                    // Redirect to home page
                    router.push("/");
                }
            } catch (error) {
                // Not authenticated, stay on login page
            }
        }
        checkAuth();
    }, [router, setUserSub]);

    const handleGoogleLogin = async () => {
        try {
            // Fetch Google Client ID from public config RPC
            const { getPublicConfig } = await import("../../src/lib/rpc/configClient");
            const config = await getPublicConfig();
            const clientId = config.googleClientId;
            const redirectUri = `${window.location.origin}/authentication/oauth/google`;
            const scope = "openid email profile";
            const responseType = "code";

            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `response_type=${responseType}&` +
                `scope=${encodeURIComponent(scope)}&` +
                `access_type=offline&` +
                `prompt=consent`;

            window.location.href = googleAuthUrl;
        } catch (error) {
            console.error("Failed to get Google Client ID:", error);
        }
    };

    if (!isClient) {
        return null;
    }

    return (
        <>
            <style jsx>{`
                @media (prefers-color-scheme: dark) {
                    .login-container {
                        background: #000000;
                    }
                    .login-card {
                        background: #1a1a1a;
                        border: 1px solid #333333;
                    }
                    .login-title {
                        color: #ffffff;
                    }
                    .login-subtitle {
                        color: #cccccc;
                    }
                    .login-button {
                        background: #ffffff;
                        color: #000000;
                    }
                    .login-button:hover {
                        background: #e0e0e0;
                    }
                    .login-button-icon {
                        fill: #000000;
                    }
                }

                @media (prefers-color-scheme: light) {
                    .login-container {
                        background: #ffffff;
                    }
                    .login-card {
                        background: #ffffff;
                        border: 1px solid #000000;
                    }
                    .login-title {
                        color: #000000;
                    }
                    .login-subtitle {
                        color: #666666;
                    }
                    .login-button {
                        background: #000000;
                        color: #ffffff;
                    }
                    .login-button:hover {
                        background: #333333;
                    }
                    .login-button-icon {
                        fill: #ffffff;
                    }
                }
            `}</style>
            <div className="login-container" style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "clamp(12px, 3vw, 24px)",
            }}>
                <div className="login-card" style={{
                    borderRadius: "clamp(12px, 3vw, 16px)",
                    padding: "clamp(32px, 8vw, 48px)",
                    maxWidth: 400,
                    width: "100%",
                    textAlign: "center",
                }}>
                    <h1 className="login-title" style={{ fontSize: "clamp(24px, 6vw, 32px)", marginBottom: "16px", fontWeight: "300", letterSpacing: "-0.02em" }}>
                        Welcome
                    </h1>
                    <p className="login-subtitle" style={{
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        marginBottom: "32px",
                        fontWeight: "300",
                    }}>
                        Sign in with Google to continue
                    </p>
                    <button
                        onClick={handleGoogleLogin}
                        className="login-button"
                        style={{
                            width: "100%",
                            padding: "12px 24px",
                            fontSize: "clamp(16px, 4vw, 18px)",
                            fontWeight: "400",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            transition: "background 0.2s ease",
                        }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            style={{ flexShrink: 0 }}
                            className="login-button-icon"
                        >
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Sign in with Google
                    </button>
                </div>
            </div>
        </>
    );
}
