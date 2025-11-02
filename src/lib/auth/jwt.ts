import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production");

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
    return new SignJWT(jwtPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
}

