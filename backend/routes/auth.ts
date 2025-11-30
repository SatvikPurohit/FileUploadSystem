import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import prisma from "../prisma/prisma.client";
import ms from "ms";

/**
 * Payload type (for TS only; Joi handles runtime validation)
 */
type LoginPayload = {
  email?: string;
  username?: string;
  password?: string;
};

const routes: ServerRoute[] = [
  {
    method: "POST",
    path: "/api/auth/refresh",
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          refresh: Joi.string().required(),
        }),
        failAction: (request, h, err) => {
          return h.response({ message: err?.message }).code(400).takeover();
        },
      },
    },
    handler: async (request, h) => {
      const { refresh } = request.payload as { refresh: string };

      try {
        const decoded = jwt.verify(refresh, JWT_SECRET) as { userId: number };
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user || !user.refreshTokenHash) {
          return h.response({ message: "Invalid refresh" }).code(401);
        }

        const ok = await bcrypt.compare(refresh, user.refreshTokenHash);
        if (!ok) return h.response({ message: "Invalid refresh" }).code(401);

        // rotate refresh token
        const newRefresh = jwt.sign({ userId: user.id }, JWT_SECRET, {
          expiresIn: "7d",
        });
        const newHash = await bcrypt.hash(newRefresh, 8);
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: newHash },
        });

        const newAccess = jwt.sign(
          { userId: user.id, email: user.email },
          JWT_SECRET,
          {
            expiresIn: "15m",
          }
        );

        // set cookies again
        h.state("access_token", newAccess, {
          ttl: ms("15m"),
          isHttpOnly: false,
          isSameSite: "Lax",
          path: "/",
        });
        h.state("refresh_token", newRefresh, {
          ttl: ms("7d"),
          isHttpOnly: false,
          isSameSite: "Lax",
          path: "/",
        });

        return h.response({ accessToken: newAccess }).code(200);
      } catch (e) {
        return h.response({ message: "Invalid refresh" }).code(401);
      }
    },
  },
  {
    method: "GET",
    path: "/api/auth/verify-status",
    handler: (request, h) => {
      const token = (request.state && (request.state as any).token) || null;

      if (!token) {
        return h.response({ ok: false, message: "no token" }).code(401);
      }

      try {
        const payload = jwt.verify(token, JWT_SECRET) as {
          id: string;
          [k: string]: any;
        };

        return h.response({ ok: true, userId: payload.id }).code(200);
      } catch (err) {
        return h.response({ ok: false, message: "invalid token" }).code(401);
      }
    },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    handler: async (request, h) => {
      // clear stored hash (optional)
      const refreshToken =
        (request.payload as any)?.refresh ||
        (request.state as any)?.refresh_token;
      try {
        if (refreshToken) {
          const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
          if (decoded?.userId) {
            await prisma.user.update({
              where: { id: decoded.userId },
              data: { refreshTokenHash: null },
            });
          }
        }
      } catch (e) {
        // ignore
      }

      h.unstate("access_token", { path: "/" });
      h.unstate("refresh_token", { path: "/" });

      return h.response({ ok: true }).code(200);
    },
  },
  {
    method: "POST",
    path: "/api/auth/login",
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().email().optional(),
          username: Joi.string().optional(),
          password: Joi.string().min(1).required(),
        })
          .or("email", "username")
          .messages({
            "object.missing": "Either email or username is required",
            "any.required": "Missing required fields",
          }),
        failAction: (request, h, err) => {
          return h.response({ message: err?.message }).code(400).takeover();
        },
      },
    },
    handler: async (request, h) => {
      const payload = request.payload as any;
      const identifier = (payload.email ?? payload.username ?? "").trim();
      const password = (payload.password ?? "").toString();

      const user = await prisma.user.findUnique({
        where: { email: identifier },
      });

      if (!user) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }

      // create tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        {
          expiresIn: "15m",
        }
      );

      const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // store hashed refresh token on user row (rotation)
      const hash = await bcrypt.hash(refreshToken, 8);
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: hash },
      });

      // set cookies (non HttpOnly so client can read them per spec)
      h.state("access_token", accessToken, {
        ttl: ms("15m"),
        isSecure: process.env.NODE_ENV === "production",
        isHttpOnly: false,
        path: "/",
        isSameSite: "Lax",
      });

      h.state("refresh_token", refreshToken, {
        ttl: ms("7d"),
        isSecure: process.env.NODE_ENV === "production",
        isHttpOnly: false,
        path: "/",
        isSameSite: "Lax",
      });

      return h.response({ ok: true, accessToken }).code(200);
    },
  },
];

export default routes;
