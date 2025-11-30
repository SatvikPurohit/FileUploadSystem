// utils/simpleRateLimit.ts
import { Request, ResponseToolkit } from "@hapi/hapi";

/* ----------------- internal bucket impl ----------------- */
type Bucket = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, Bucket>();

function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.expiresAt) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (bucket.count < max) {
    bucket.count++;
    return true;
  }

  return false;
}

/* ----------------- exported limiters (typed) ----------------- */

/** Global limiter — 100 req/min per IP */
export function limitGlobal(request: Request, h: ResponseToolkit) {
  const ip = request.info.remoteAddress ?? "unknown";
  const ok = limit(`ip:${ip}`, 100, 60_000);

  if (!ok) {
    return h
      .response({ message: "Too many requests" })
      .code(429)
      .header("Retry-After", "60")
      .takeover();
  }
  return h.continue;
}

/** Login limiter — 5 attempts / 15min per IP and per username */
export function limitLogin(request: Request, h: ResponseToolkit) {
  const ip = request.info.remoteAddress ?? "unknown";
  const body = (request.payload || {}) as any;
  const username = (body.email || body.username || "").toString().toLowerCase();

  const okIP = limit(`login-ip:${ip}`, 5, 15 * 60_000);
  const okUser = username
    ? limit(`login-user:${username}`, 5, 15 * 60_000)
    : true;

  if (!okIP || !okUser) {
    return h
      .response({
        message: "Too many login attempts. Try again in 15 minutes.",
      })
      .code(429)
      .takeover();
  }
  return h.continue;
}

/** Refresh limiter — 20 refresh/min per token prefix or IP */
export function limitRefresh(request: Request, h: ResponseToolkit) {
  // NOTE: request.state has unknown keys at compile time; narrow it safely
  const refreshToken = (request.state as Record<string, any>)?.refresh_token as
    | string
    | undefined;
  const key = refreshToken
    ? `r:${String(refreshToken).slice(0, 12)}`
    : `rip:${request.info.remoteAddress}`;
  const ok = limit(key, 20, 60_000);

  if (!ok) {
    return h
      .response({ message: "Too many refresh attempts" })
      .code(429)
      .takeover();
  }
  return h.continue;
}

/* ----------------- Upload concurrency helpers (typed) ----------------- */

const activeUploads = new Map<number, number>();

export function tryStartUpload(userId: number): boolean {
  const cur = activeUploads.get(userId) ?? 0;
  if (cur >= 3) return false;
  activeUploads.set(userId, cur + 1);
  return true;
}

export function finishUpload(userId: number) {
  const cur = activeUploads.get(userId) ?? 0;
  const next = Math.max(0, cur - 1);
  if (next === 0) activeUploads.delete(userId);
  else activeUploads.set(userId, next);
}

export function limitUploadCount(userId: number): boolean {
  return limit(`upload-count:${userId}`, 20, 60 * 60_000);
}
