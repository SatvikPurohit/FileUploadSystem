// server.ts
import Hapi from "@hapi/hapi";
import ms from "ms";
import InertPlugin from "@hapi/inert";
import { PORT, FRONTEND_URL, JWT_SECRET } from "./config";
import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/upload";

async function createServer() {
  const server = Hapi.server({
    port: PORT || 4000,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: [FRONTEND_URL, "http://localhost:3000"],
        credentials: true,
        additionalHeaders: [
          "authorization",
          "content-type",
          "x-requested-with",
        ],
        additionalExposedHeaders: [
          "set-cookie",
          "WWW-Authenticate",
          "Server-Authorization",
        ],
      },
      payload: {
        output: "data",
        parse: true,
        multipart: {
          output: "stream",
        },
        maxBytes: 104857600, // 100MB
      },
    },
  });

  // NOTE: Cookies are NOT HttpOnly intentionally (so client can read them per user's spec).
  // This is less secure. For production, prefer HttpOnly refresh cookies.
  server.state("access_token", {
    ttl: ms("15m"),
    isSecure: process.env.NODE_ENV === "production",
    isHttpOnly: false, // <--- readable by JS (as requested)
    path: "/",
    isSameSite: "Lax",
  });

  server.state("refresh_token", {
    ttl: ms("7d"),
    isSecure: process.env.NODE_ENV === "production",
    isHttpOnly: false, // <--- readable by JS (as requested)
    path: "/",
    isSameSite: "Lax",
  });

  await server.register(InertPlugin as any);
  await server.register(require("hapi-auth-jwt2"));

  server.auth.strategy("jwt-auth", "jwt", {
    key: JWT_SECRET,
    validate: async (decoded: { userId: any }) => {
      if (decoded && decoded.userId) {
        return { isValid: true, credentials: decoded };
      } else {
        return { isValid: false };
      }
    },
    verifyOptions: { algorithms: ["HS256"] },
    tokenType: "",
    cookieKey: "access_token",
  });

  server.route(authRoutes);
  server.route(uploadRoutes);

  return server;
}

if (require.main === module) {
  (async () => {
    const server = await createServer();
    await server.start();
    console.log("Server running on", server.info.uri);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default createServer;
