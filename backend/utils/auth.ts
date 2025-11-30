import jwt from "jsonwebtoken";
import { Request } from "@hapi/hapi";
import { JWT_SECRET } from "./../config";

export type DecodedToken = {
  userId: number;
  email?: string;
  iat?: number;
  exp?: number;
  [k: string]: any;
} | null;

export async function validateAuth(request: Request): Promise<DecodedToken> {
  const token = (request.state && (request.state as any).access_token) || null;
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (err: any) {
    console.error("JWT validation error:", err.message);
    return null;
  }
}
