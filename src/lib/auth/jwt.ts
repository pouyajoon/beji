import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production");

export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export async function signJWT(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
    return new SignJWT({ userId: payload.userId, email: payload.email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
}

