import JWT, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { Request } from "@hapi/hapi";

const prisma = new PrismaClient();

/**
 * Helpers
 */
export const makeTokenId = () => crypto.randomBytes(16).toString("hex");

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Access token (signed JWT) - short lived
 */
export const signAccessToken = (payload: object) => {
  return JWT.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

/**
 * Refresh token: sign JWT and store its HASH in the user's row.
 * NOTE: this function is async because it writes to DB.
 *
 * Returns { token, tokenId } where token is the raw JWT (to set in cookie)
 */
export const signRefreshToken = async (
  payload: any
): Promise<{ token: string; tokenId: string }> => {
  const tokenId = makeTokenId();
  const token = JWT.sign({ jti: tokenId, ...payload }, JWT_SECRET, {
    expiresIn: "7d",
  });

  // store only hash in DB (field: refreshTokenHash)
  const hashed = hashToken(token);
  if (!payload?.sub)
    throw new Error("signRefreshToken: payload.sub (userId) required");

  await prisma.user.update({
    where: { id: payload.sub },
    data: { refreshTokenHash: hashed },
  });

  return { token, tokenId };
};

/**
 * Verify refresh token:
 *  - verify signature
 *  - check the user's stored refreshTokenHash matches hash(token)
 *
 * returns decoded payload or null
 */
export const verifyRefresh = async (token: string) => {
  try {
    const decoded = JWT.verify(token, JWT_SECRET) as JwtPayload;
    const userId = decoded.sub as string | undefined;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { refreshTokenHash: true },
    });

    if (!user || !user.refreshTokenHash) return null;

    const hashed = hashToken(token);
    if (hashed !== user.refreshTokenHash) return null; // mismatch = revoked/invalid

    return decoded;
  } catch (e) {
    return null;
  }
};

/**
 * Revoke refresh token: clear stored hash for user
 */
export const revokeRefresh = async (userId: string = "") => {
  if(!userId) return;
  await prisma.user.update({
    where: { id: parseInt(userId) },
    data: { refreshTokenHash: null },
  });
};

export const validateAuth = async (
  request: Request
): Promise<JwtPayload | null> => {
  const authHeader = request.headers.authorization as string | undefined;

  let token: string | null = null;

  // 1. Prefer Authorization header
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }
  // 2. Fallback to cookie
  else if ((request as any).state?.access_token) {
    token = (request as any).state.access_token;
  }

  if (!token) return null;

  try {
    const decoded = JWT.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (err) {
    return null;
  }
};

export const verifyCsrf = async (request: Request, h: any) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return h.continue;
  }
  const cookie = request.state.csrf_token;
  const header = request.headers["x-csrf-token"];
  if (!cookie || !header || cookie !== header) {
    return h.response({ message: "CSRF mismatch" }).code(403);
  }
  return h.continue;
};
