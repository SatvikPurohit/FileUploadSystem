import Hapi from "@hapi/hapi";

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: "localhost",
  });

  server.route({
    method: "GET",
    path: "/health",
    handler: async (request, responseToolkit) => {
      console.log({ request });
      // request = incoming HTTP request object
      // responseToolkit (used to craft responses)
      return responseToolkit
        .response({ status: "ok", timestamp: new Date() })
        .code(200);
    },
    options: {
      cors: {
        origin: [""],
      },
    },
  });

  //   *************** Other server. functions
  //   For auth: Plugin = reusable piece of logic LOG, AUTH, DB Connections
  //   Register (async register : () => {}) function (required) as part of custome plugin logic- this is where plugin logic goes
  // server.register(hapiAuthJwt2 as any); --> await server.register to register auth/any plugin
  // server.auth.strategy("jwt", "jwt",  --> // JWT encode to decode and pass to validatior
  //   -----
  //   On server start logs:
  // server.events.on("start", () => { --> helpful debug: print routes after registration
  //   ----
  //   Server extensions: Lifecycle hooks run code at specific points in request processing.
  // responseToolkit.continue = tells Hapi to continue processing the request, Without this, request would hang
  // server.ext("onRequest" --> log requests, returns responseToolkit.continue
  // server.ext("onPreResponse" --> check error and log, returns responseToolkit.continue

  // 'await' waits for server to fully start before continuing
  await server.start();
};

// Handle errors if server fails to start
process.on("unhandledRejection", (err) => {
  console.error(err);
  process.exit(1); // Exit with error code
});

init();
