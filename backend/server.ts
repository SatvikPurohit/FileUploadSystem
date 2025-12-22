// server.ts
import Hapi from "@hapi/hapi";
import hapiAuthJwt2 from "hapi-auth-jwt2";
import registerRoutes from "./routesConfig"; // assume this imports all your route files
import { FRONTEND_URL, PORT } from "./config";

const JWT_SECRET = process.env.JWT_SECRET || "shh";

export async function createServer() {
  const server = Hapi.server({
    port: PORT || 4000,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: [FRONTEND_URL || "http://localhost:3000"],
        credentials: true,
        additionalHeaders: [
          "authorization",
          "x-csrf-token",
          "x-requested-with",
        ],
        exposedHeaders: ["set-cookie"],
      },
      // NOTE: DO NOT set payload.parse globally (it will break streaming routes)
      payload: {
        maxBytes: 200 * 1024 * 1024, // default global cap
      },
    },
  });

  // plugin: register auth plugin
  await server.register(hapiAuthJwt2 as any);

  // jwt strategy: validate must NOT read request.payload
  const validate = async (
    decoded: any,
    request: Hapi.Request,
    h: Hapi.ResponseToolkit
  ) => {
    console.log("AUTH validate(decoded):", decoded);
    const userId = decoded?.id;
    const isValid = Boolean(userId);
    const credentials = { id: userId };
    return { isValid, credentials };
  };

  // JWT decode
  server.auth.strategy("jwt", "jwt", {
    key: JWT_SECRET,
    validate,
    verifyOptions: { algorithms: ["HS256"] },
    cookieKey: "token",
  } as any);

  // register your app routes
  // Hapi uses server.route() to map URLs to handlers.
  server.route(await registerRoutes());

  // helpful debug: print routes after registration
  server.events.on("start", () => {
    console.log("Server running at", server.info.uri);
    console.log("Registered routes:");
    console.log(
      server
        .table()
        .map(
          (r) =>
            `${r.method.toUpperCase()} ${r.path} payload=${!!r.settings
              .payload}`
        )
        .join("\n")
    );
  });

  // Each incoming request passes through the request lifecycle.
  // the request path and method can be modified via the request.setUrl() and request.setMethod() methods.
  // Changes to the request path or method will impact how the request is routed and can be used for rewrite rules.
  server.ext("onRequest", (request, h) => {
    console.log("Incoming Request Headers:", request.headers);
    console.log(
      "Incoming Request Content-Type:",
      request.headers["content-type"]
    );
    console.log("Incoming Content-Length:", request.headers["content-length"]);
    return h.continue; //
  });

  // log boom stacks on response
  // onPreResponse: always called, unless the request is aborted.
  // the response contained in request.response may be modified (but not assigned a new value).
  // To return a different response type (for example, replace an error with an HTML response)
  server.ext("onPreResponse", (request, h) => {
    const response = request.response as any;
    if (response && response.isBoom) {
      console.error("Boom response:", response?.stack || response);
    }
    return h.continue; //
  });

  await server.start();
  return server;
}

if (require.main === module) {
  createServer().catch((err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });
}
