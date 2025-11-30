// routes/upload.ts
import { ServerRoute } from "@hapi/hapi";
import Busboy from "busboy";
import type { BusboyConfig } from "busboy";
import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";
import { FRONTEND_URL, UPLOADS_DIR } from "../config";
import { validateAuth } from "../utils/auth";
import prisma from "../prisma/prisma.client";

const routes: ServerRoute[] = [
  {
    method: ["POST", "OPTIONS"],
    path: "/api/upload",
    options: {
      cors: {
        origin: [FRONTEND_URL, "http://localhost:3000"],
        credentials: true,
        additionalHeaders: [
          "authorization",
          "content-type",
          "x-requested-with",
        ],
      },
      payload: {
        output: "stream",
        parse: false,
        maxBytes: 20 * 1024 * 1024,
      },
    },
    handler: async (request, h) => {
      console.log("Upload request received");

      if (request.method === "options") {
        return h.response().code(200);
      }

      const decoded = await validateAuth(request);
      if (!decoded) return h.response({ message: "Unauthorized" }).code(401);

      return await new Promise((resolve) => {
        const config: BusboyConfig = {
          headers: request.raw.req.headers,
          limits: { fileSize: 20 * 1024 * 1024 },
        };

        const busboy = Busboy(config);

        const results: any[] = [];
        let fileFound = false;

        busboy.on(
          "file",
          (
            fieldname: string,
            file: NodeJS.ReadableStream,
            info: { filename: string; encoding: string; mimeType: string }
          ) => {
            fileFound = true;

            const { filename, mimeType } = info;
            const ts = Date.now();

            const safeName = `${ts}_${filename}`.replace(
              /[^a-zA-Z0-9-_.]/g,
              "_"
            );
            const userDir = path.join(
              UPLOADS_DIR,
              String((decoded as any).userId)
            );
            mkdirp.sync(userDir);

            const destPath = path.join(userDir, safeName);
            const writeStream = fs.createWriteStream(destPath);

            file.pipe(writeStream);

            writeStream.on("finish", async () => {
              try {
                const stats = fs.statSync(destPath);
                const doc = await prisma.document.create({
                  data: {
                    userId: Number((decoded as any).userId),
                    filename,
                    path: destPath,
                    contentType: mimeType,
                    size: stats.size,
                    uploadedAt: new Date(),
                    status: "success",
                  },
                });

                results.push({ id: doc.id, filename: doc.filename });
              } catch (err) {
                results.push({ error: "failed", filename });
              }
            });

            writeStream.on("error", () => {
              results.push({ error: "failed", filename });
            });
          }
        );

        busboy.on("finish", () => {
          if (!fileFound) {
            return resolve(h.response({ error: "No file uploaded" }).code(400));
          }
          resolve({ ok: true, results });
        });

        busboy.on("error", (err) => {
          console.error("Busboy error", err);
          resolve(h.response({ error: "Parse error" }).code(415));
        });

        request.raw.req.pipe(busboy);
      });
    },
  },
];

export default routes;
