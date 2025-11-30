// server.ts
import Hapi from "@hapi/hapi";
import ms from "ms";
import InertPlugin from "./plugins/inert";
import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/upload";
import { PORT, FRONTEND_URL } from "./config";
import { limitGlobal, limitLogin, limitRefresh } from "./utils/simpleRateLimit";

async function start() {
  const server = Hapi.server({
    port: PORT,
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

  // ---------------- Global cookie config ----------------
  server.state("refresh_token", {
    ttl: ms("30d"), // 30 days
    isSecure: process.env.NODE_ENV === "production",
    isHttpOnly: true,
    path: "/", // cookie valid site-wide
    isSameSite: "Lax",
  });

  // ---------------- Global pre-auth hook ----------------
  // Runs once (registered at startup) for every incoming request BEFORE auth and route handlers.
  server.ext("onPreAuth", (request, h) => {
    // 1) Global per-IP rate limiting (always apply)
    const globalResult = limitGlobal(request, h);
    if (globalResult !== h.continue) {
      // limitGlobal returned a takeover response (429)
      return globalResult;
    }

    // 2) Route-specific limits (login & refresh)
    // Put lightweight per-route checks here so we don't need to edit route files.
    const path = request.path || "";
    const method = (request.method || "").toUpperCase();

    // Login route (POST /api/auth/login)
    if (method === "POST" && path === "/api/auth/login") {
      const loginResult = limitLogin(request, h);
      if (loginResult !== h.continue) return loginResult; // takeover on 429
    }

    // Refresh route (POST /api/auth/refresh)
    if (method === "POST" && path === "/api/auth/refresh") {
      const refreshResult = limitRefresh(request, h);
      if (refreshResult !== h.continue) return refreshResult;
    }

    // If nothing blocked, continue normal lifecycle
    return h.continue;
  });

  // ---------------- Lightweight request logging ----------------
  server.ext("onRequest", (request, h) => {
    try {
      const ct = request.headers["content-type"] || "unknown";
      console.log(
        "[onRequest] %s %s content-type=%s remote=%s",
        request.method.toUpperCase(),
        request.path,
        ct,
        request.info.remoteAddress
      );
    } catch (e) {
      // noop
    }
    return h.continue;
  });

  // Register static asset plugin
  await server.register(InertPlugin);

  // Register routes
  server.route(authRoutes);
  server.route(uploadRoutes);

  // Start server
  await server.start();
  console.log("Server running on %s", server.info.uri);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
