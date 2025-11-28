import jwt from 'jsonwebtoken';
import { Request } from '@hapi/hapi';
import { JWT_SECRET } from './../config';

export type DecodedToken = {
  userId: number;
  email?: string;
  iat?: number;
  exp?: number;
  [k: string]: any;
} | null;

export async function validateAuth(request: Request): Promise<DecodedToken> {
  const auth = (request.headers.authorization as string) || '';
  if (!auth) return null;
  const m = /^Bearer (.+)$/.exec(auth);
  if (!m) return null;
  try {
    const decoded = jwt.verify(m[1], JWT_SECRET) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
}
