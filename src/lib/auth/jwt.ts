import { SignJWT, jwtVerify } from "jose";

// Helper function to get env vars at runtime only, preventing Next.js build-time analysis
function getEnvVar(key: string): string | undefined {
    // Access via bracket notation to prevent static analysis
    return process.env[key];
}

// Get JWT secret at runtime to prevent build-time inlining
function getJWTSecret(): Uint8Array {
    const secret = getEnvVar("JWT_SECRET") || "your-secret-key-change-in-production";
    return new TextEncoder().encode(secret);
}

export interface JWTPayload {
    userId: string;
    email: string;
    picture?: string;
    iat?: number;
    exp?: number;
}

export async function signJWT(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
    const jwtPayload: any = { userId: payload.userId, email: payload.email };
    if (payload.picture) {
        jwtPayload.picture = payload.picture;
    }
    const secret = getJWTSecret();
    return new SignJWT(jwtPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
}

