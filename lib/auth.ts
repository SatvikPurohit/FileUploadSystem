import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";

export const ACCESS_EXPIRY= "15m"
export const REFRESH_TTL_SEC = 24 * 60 * 60
export const DEV_ACCESS_SECRET = "dev_access_secret"

export const signAccess = (payload:object) => {
 return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || DEV_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export const createRefreshToken =  () => {
 return crypto.randomBytes(48).toString("hex");
}

export const hashToken =  (token: string) => {
 return bcrypt.hash(token, 10);
}

export const verifyTokenHash =  (hash:string | null, token: string) => {
 if (!hash) return false;
 return bcrypt.compare(token, hash);   
}

export function verifyAccess(token: string) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
}