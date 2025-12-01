import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { JWT_SECRET } from "../config";
import ms from "ms";
import {
  revokeRefresh,
  signAccessToken,
  signRefreshToken,
  verifyCsrf,
  verifyRefresh,
} from "../utils/auth";
import JWT, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../prisma/prisma.client";
import bcrypt from "bcryptjs";
import { Request, ResponseToolkit } from "@hapi/hapi";

interface LoginPayload {
  email: string;
  password: string;
}

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
      const refresh = (request.state && request.state.refresh_token) || null;
      if (!refresh)
        return h.response({ message: "No refresh token" }).code(401);

      const decoded = await verifyRefresh(refresh);
      if (!decoded)
        return h.response({ message: "Invalid refresh token" }).code(401);

      const userId = (decoded as JwtPayload).sub;
      // revoke old token (clear hash)
      await revokeRefresh(userId);

      const accessToken = signAccessToken({ sub: userId });
      const { token: newRefreshToken } = await signRefreshToken({
        sub: userId,
      });

      // set cookies (HttpOnly), same as before
      h.state("access_token", accessToken, { ttl: ms("15m") });
      h.state("refresh_token", newRefreshToken, { ttl: ms("7d") });

      return h.response({ accessToken });
    },
  },
  {
    method: "POST",
    path: "/api/auth/verify-status",
    options: { pre: [{ method: verifyCsrf }] },
    handler: async (req, h) => {
      // prefer Authorization header if present, else cookie access_token
      const authHeader = req.headers.authorization;
      let token = null;
      if (authHeader && authHeader.startsWith("Bearer "))
        token = authHeader.slice(7);
      else if (req.state && req.state.access_token)
        token = req.state.access_token;

      if (!token) return h.response({ message: "Unauthorized" }).code(401);

      try {
        const decoded = JWT.verify(token, JWT_SECRET);
        return h.response({ ok: true, user: decoded.sub });
      } catch (err) {
        return h.response({ message: "Unauthorized" }).code(401);
      }
    },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    handler: async (request, h) => {
      const refresh = (request.state && request.state.refresh_token) || null;
      if (refresh) {
        try {
          const decoded = JWT.verify(refresh, JWT_SECRET) as JwtPayload;
          if (decoded && decoded.sub) await revokeRefresh(decoded.sub);
        } catch (e) {
          return h.response({ message: "" }).code(500);
        }
      }

      // clear cookies (send expired)
      h.unstate("access_token", { path: "/" });
      h.unstate("refresh_token", { path: "/auth/refresh" });
      h.unstate("csrf_token", { path: "/" });

      return h.response({ ok: true });
    },
  },
  {
    method: "POST",
    path: "/api/auth/login",
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().required,
          password: Joi.string().min(1).required(),
        })
          .or("email", "email")
          .messages({
            "object.missing": "Either email or email is required",
            "any.required": "Missing required fields",
          }),
        failAction: (request, h, err) => {
          return h.response({ message: err?.message }).code(400).takeover();
        },
      },
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as LoginPayload;
      const { email, password } = payload;

      if (!password || !email) {
        return h
          .response({ message: "username/email and password required" })
          .code(400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email },
      });

      if (!user) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }

      // issue tokens
      const accessToken = signAccessToken({ sub: user.id });
      const { token: refreshToken } = await signRefreshToken({ sub: user.id });

      const csrf = crypto.randomBytes(24).toString("hex");

      h.state("access_token", accessToken, { ttl: ms("15m") });
      h.state("refresh_token", refreshToken, { ttl: ms("7d") });
      h.state("csrf_token", csrf, { ttl: ms("7d") });

      return h.response({ accessToken });
    },
  },
];

export default routes;
