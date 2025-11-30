import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import prisma from "../prisma/prisma.client";

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
    path: "/api/auth/login",
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().email().optional(),
          username: Joi.string().optional(),
          password: Joi.string().min(1).required(),
        })
          // at least one of email OR username must be present
          .or("email", "username")
          .messages({
            "object.missing": "Either email or username is required",
            "any.required": "Missing required fields",
          }),
        failAction: (request, h, err) => {
          // expose Joi errors in dev; hide in prod
          return h.response({ message: err?.message }).code(400).takeover();
        },
      },
    },

    handler: async (request, h) => {
      const payload = request.payload as LoginPayload;

      // Accept email OR username
      const email = (payload.email ?? payload.username ?? "").trim();
      const password = (payload.password ?? "").toString();

      console.log("Login attempt for:", email);

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }

      // Tokens
      const access = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      const refresh = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // Store hashed refresh token (for rotation)
      const hash = await bcrypt.hash(refresh, 8);
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: hash },
      });

      h.state("refresh_token", refresh);

      return h.response({
        accessToken: access,
        refreshToken: refresh,
      });
    },
  },

  // ----------- REFRESH TOKEN -------------
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
      const refresh = request.state?.refresh_token;

      if (!refresh) {
        return h.response({ message: "No refresh token" }).code(401);
      }

      try {
        const decoded = jwt.verify(refresh, JWT_SECRET) as { userId: number };

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user || !user.refreshTokenHash) {
          return h.response({ message: "Invalid" }).code(401);
        }

        const ok = await bcrypt.compare(refresh, user.refreshTokenHash);
        if (!ok) return h.response({ message: "Invalid" }).code(401);

        const newRefresh = jwt.sign({ userId: user.id }, JWT_SECRET, {
          expiresIn: "7d",
        });
        
        const newHash = await bcrypt.hash(newRefresh, 8);
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: newHash },
        });
        h.state("refresh_token", newRefresh);

        const access = jwt.sign(
          { userId: user.id, email: user.email },
          JWT_SECRET,
          { expiresIn: "15m" }
        );

        return { accessToken: access };
      } catch (e) {
        return h.response({ message: "Invalid" }).code(401);
      }
    },
  },
];

export default routes;
