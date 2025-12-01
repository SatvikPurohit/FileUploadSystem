import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { JWT_SECRET } from "../config";
import ms from "ms";
import {
  revokeRefresh,
  signAccessToken,
  signRefreshToken,
  verifyCsrf,
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
      payload: {
        output: "data",
        parse: true,
        allow: "application/json",
      },
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
      // read refresh_token cookie
      const refreshToken = (request.state as any)?.refresh_token;
      if (!refreshToken) {
        return h.response({ ok: false, error: "no refresh token" }).code(401);
      }

      try {
        // verify refresh token (use different secret or key in production)
        const payload = JWT.verify(refreshToken, JWT_SECRET) as any;
        // optionally check token type/expiry/db to ensure it's a valid refresh token
        const userId =
          payload?.sub ||
          payload?.subId ||
          payload?.sub ||
          payload?.id ||
          payload?.sub;

        if (!userId) {
          return h
            .response({ ok: false, error: "invalid refresh token" })
            .code(401);
        }

        // create short-lived access token
        const accessToken = signAccessToken({ sub: userId });

        // Option A: set HttpOnly cookie (recommended)
        h.state("token", accessToken, {
          isHttpOnly: true,
          isSecure: process.env.NODE_ENV === "production",
          isSameSite: "Lax",
          path: "/",
          ttl: 15 * 60 * 1000,
        });

        // Option B: also return token in body if frontend wants to store/use it
        return h.response({ ok: true, accessToken }).code(200);
      } catch (err) {
        console.error("refresh verify failed", err);
        return h
          .response({ ok: false, error: "invalid refresh token" })
          .code(401);
      }
    },
  },
  {
    method: "POST",
    path: "/api/auth/verify-status",
    options: {
      payload: {
        output: "data",
        parse: true,
        allow: "application/json",
      },
      auth: false,
    },
    handler: async (req, h) => {
      // token could be in cookie 'token' or in Authorization header "Bearer <token>"
      const token =
        (req.state && (req.state as any).token) ||
        (req.headers["authorization"] || "").split(" ")[1];

      if (!token)
        return h.response({ ok: false, message: "no token" }).code(401);

      try {
        const payload = JWT.verify(token, JWT_SECRET) as { id?: string };
        return h.response({ ok: true, userId: payload?.id || null }).code(200);
      } catch (err) {
        return h.response({ ok: false, message: "invalid" }).code(401);
      }
    },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    options: {
      payload: {
        output: "data",
        parse: true,
        allow: "application/json",
      },
      pre: [{ method: verifyCsrf }],
    },
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
      h.unstate("token", { path: "/" });
      h.unstate("refresh_token", { path: "/auth/refresh" });
      h.unstate("csrf_token", { path: "/" });

      return h.response({ ok: true });
    },
  },
  {
    method: "POST",
    path: "/api/auth/login",
    options: {
      payload: {
        output: "data",
        parse: true,
        allow: "application/json",
      },
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().required(),
          username: Joi.string().optional(),
          password: Joi.string().min(1).required(),
        })
          .or("email", "username")
          .messages({
            "object.missing": "Either email or username is required",
            "any.required": "Missing required fields",
            "string.email": "Email must be a valid email address",
            "string.min": "Password must be at least {#limit} characters",
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

      // set access token
      h.state("token", accessToken, {
        isHttpOnly: true,
        path: "/",
        isSameSite: "None",
        isSecure: false, // allowed on localhost
      });

      // set refresh token
      h.state("refresh_token", refreshToken, {
        isHttpOnly: true,
        path: "/",
        isSameSite: "None",
        isSecure: false,
      });

      // set csrf token
      h.state("csrf_token", csrf, {
        isHttpOnly: false,
        path: "/",
        isSameSite: "None",
        isSecure: false,
      });

      const token = JWT.sign({ sub: user.id }, JWT_SECRET, {
        expiresIn: "15m",
      });
      return h.response({ ok: true, accessToken }).state("token", token, {
        isHttpOnly: true,
        isSecure: process.env.NODE_ENV === "production",
        isSameSite: "Lax",
        path: "/",
        ttl: 15 * 60 * 1000,
      });
    },
  },
];

export default routes;
