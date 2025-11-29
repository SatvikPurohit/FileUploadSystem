import "@hapi/inert";
import Hapi from "@hapi/hapi";

import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/upload";
import { PORT, FRONTEND_URL } from "./config";
import InertPlugin from "./plugins/inert";

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
        maxBytes: 104857600,
      },
    },
  });

  await server.register(InertPlugin);

  server.route(authRoutes);
  server.route(uploadRoutes);


  server.ext("onRequest", (request, h) => {
    try {
      const ct = request.headers["content-type"] || "unknown";
      console.log(
        "[onRequest] %s %s content-type=%s",
        request.method.toUpperCase(),
        request.path,
        ct
      );
    } catch (e) {}
    return h.continue;
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
