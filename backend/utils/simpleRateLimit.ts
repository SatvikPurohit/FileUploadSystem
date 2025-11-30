import { Request, ReqRefDefaults, ResponseToolkit } from "@hapi/hapi";

type Bucket = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, Bucket>();

/** Generic sliding-window limiter */
function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.expiresAt) {
    buckets.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return true;
  }

  if (bucket.count < max) {
    bucket.count++;
    return true;
  }

  return false;
}

/** GLOBAL: 100 req/min per IP */
export function limitGlobal(
  request: { info: { remoteAddress: string } },
  h: {
    response: (arg0: { message: string }) => {
      (): any;
      new (): any;
      code: {
        (arg0: number): {
          (): any;
          new (): any;
          header: {
            (arg0: string, arg1: string): {
              (): any;
              new (): any;
              takeover: { (): any; new (): any };
            };
            new (): any;
          };
        };
        new (): any;
      };
    };
    continue: any;
  }
) {
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

/** LOGIN brute-force: 5 attempts per 15 min (per IP + per username) */
export function limitLogin(
  request: { info: { remoteAddress: string }; payload: {} },
  h: {
    response: (arg0: { message: string }) => {
      (): any;
      new (): any;
      code: {
        (arg0: number): {
          (): any;
          new (): any;
          takeover: { (): any; new (): any };
        };
        new (): any;
      };
    };
    continue: any;
  }
) {
  const ip = request.info.remoteAddress ?? "unknown";
  const body: { email: string; username: string } = (request.payload = {
    email: "",
    username: "",
  });
  const username =
    (body.email || body.username || "").toLowerCase().trim() || "";

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

/** REFRESH spam protection: 20 refresh / min per refresh token hash prefix */
export function limitRefresh(request: Request<ReqRefDefaults>, h: ResponseToolkit<ReqRefDefaults>) {
  const refresh = request.state?.refresh_token || "";
  const key = refresh
    ? `r:${refresh.slice(0, 12)}`
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

/** UPLOAD CONCURRENCY (max 3 active uploads per user) */
const activeUploads = new Map<number, number>();

export function tryStartUpload(userId: number): boolean {
  const cur = activeUploads.get(userId) || 0;
  if (cur >= 3) return false;
  activeUploads.set(userId, cur + 1);
  return true;
}

export function finishUpload(userId: number) {
  const cur = activeUploads.get(userId) || 0;
  const next = Math.max(0, cur - 1);
  if (next === 0) activeUploads.delete(userId);
  else activeUploads.set(userId, next);
}

/** UPLOAD quota: max 20 uploads/hour per user */
export function limitUploadCount(userId: number): boolean {
  return limit(`upload-count:${userId}`, 20, 60 * 60_000);
}
