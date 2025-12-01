// routes/upload.ts
import { ServerRoute } from "@hapi/hapi";
import Busboy from "busboy";
import type { BusboyConfig, FileInfo } from "busboy";
import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";
import { FRONTEND_URL, UPLOADS_DIR } from "../config";
import { validateAuth } from "../utils/auth";
import prisma from "../prisma/prisma.client";
import { JwtPayload } from "jsonwebtoken";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const allowed = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
]);

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
        // This maxBytes is per-request Hapi config (defensive) — Busboy limits will still be used per-file.
        maxBytes: MAX_BYTES * 10, // allow some headroom for multiple files; final per-file checks below
      },
    },
    handler: async (request, h) => {
      // OPTIONS preflight
      if (request.method === "options") return h.response().code(200);

      // validate auth (returns decoded JWT payload or null)
      const decoded = await validateAuth(request);
      if (!decoded) return h.response({ message: "Unauthorized" }).code(401);

      // Expect user id in token 'sub'
      const userIdRaw = (decoded as JwtPayload).sub;
      if (!userIdRaw) return h.response({ message: "Unauthorized" }).code(401);
      const userId = Number(userIdRaw);
      if (!Number.isFinite(userId))
        return h.response({ message: "Invalid user id" }).code(401);

      return await new Promise((resolve) => {
        const results: Array<any> = [];
        let fileFound = false;
        let finished = false;

        const config: BusboyConfig = {
          headers: (request.raw as any).req.headers,
          limits: { fileSize: MAX_BYTES }, // per-file size limit enforced by Busboy
        };

        const busboy = Busboy(config);

        // handle file parts
        busboy.on(
          "file",
          (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
            fileFound = true;

            const filename = info?.filename || "unknown";
            // busboy versions may expose 'mimeType' or 'mimetype' — check both
            const mimeType =
              (info as any).mimeType || (info as any).mimetype || "";

            // immediate MIME validation
            if (!allowed.has(mimeType)) {
              // drain incoming stream
              file.resume();
              results.push({
                filename,
                error: "Invalid file type",
                status: "FAILED",
              });
              return;
            }

            // prepare destination
            const ts = Date.now();
            const safeName = `${ts}_${filename}`.replace(
              /[^a-zA-Z0-9-_.]/g,
              "_"
            );
            const userDir = path.join(UPLOADS_DIR, String(userId));
            try {
              mkdirp.sync(userDir);
            } catch (e) {
              console.error("mkdirp error", e);
            }
            const destPath = path.join(userDir, safeName);
            const writeStream = fs.createWriteStream(destPath);

            // defensive byte counting
            let bytesWritten = 0;
            let aborted = false;
            let streamErrored = false;

            // track data and guard size (extra defense-in-depth)
            file.on("data", (chunk: Buffer) => {
              bytesWritten += chunk.length;
              if (bytesWritten > MAX_BYTES) {
                aborted = true;
                // destroy streams and cleanup partial file
                try {
                  file.unpipe(writeStream);
                } catch (_) {}
                try {
                  writeStream.destroy();
                } catch (_) {}
                try {
                  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                } catch (_) {}
                // drain remaining file data to allow Busboy to continue
                file.resume();
                results.push({
                  filename,
                  error: "File too large",
                  status: "FAILED",
                });
              }
            });

            // pipe and handle finish
            file.pipe(writeStream);

            writeStream.on("finish", async () => {
              if (aborted || streamErrored) return;
              try {
                const stats = fs.statSync(destPath);
                // final size check
                if (stats.size > MAX_BYTES) {
                  try {
                    fs.unlinkSync(destPath);
                  } catch (_) {}
                  results.push({
                    filename,
                    error: "File too large",
                    status: "FAILED",
                  });
                  return;
                }

                // create DB record attached to user
                const doc = await prisma.document.create({
                  data: {
                    userId: userId,
                    filename,
                    path: destPath,
                    contentType: mimeType,
                    size: stats.size,
                    uploadedAt: new Date(),
                    status: "success",
                  },
                });

                results.push({
                  id: doc.id,
                  filename: doc.filename,
                  status: "SUCCESS",
                });
              } catch (err) {
                console.error("writeStream finish error", err);
                try {
                  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                } catch (_) {}
                results.push({
                  filename,
                  error: "Failed to save file",
                  status: "FAILED",
                });
              }
            });

            writeStream.on("error", (err) => {
              streamErrored = true;
              console.error("writeStream error", err);
              try {
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
              } catch (_) {}
              results.push({
                filename,
                error: "Write error",
                status: "FAILED",
              });
              // ensure incoming file stream is drained
              try {
                file.resume();
              } catch (_) {}
            });

            // Busboy may emit 'limit' on the file stream in some versions; defensively handle file 'limit' event
            (file as any).on?.("limit", () => {
              aborted = true;
              try {
                writeStream.destroy();
              } catch (_) {}
              try {
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
              } catch (_) {}
              results.push({
                filename,
                error: "File too large (limit reached)",
                status: "FAILED",
              });
              try {
                file.resume();
              } catch (_) {}
            });
          }
        ); // end busboy.on('file')

        // busboy errors
        busboy.on("error", (err: any) => {
          console.error("Busboy error", err);
          if (finished) return;
          finished = true;
          // If Busboy fails, return parse error
          resolve(
            h
              .response({
                error: "Parse error",
                details: err?.message || String(err),
              })
              .code(415)
          );
        });

        // busboy 'filesLimit' or 'partsLimit' events can be handled if desired
        busboy.on("filesLimit", () => {
          // optional: push an error if too many files
          results.push({ error: "Files limit exceeded" });
        });

        // when finished processing all parts
        busboy.on("finish", () => {
          if (finished) return;
          finished = true;

          if (!fileFound) {
            // No file encountered
            return resolve(h.response({ error: "No file uploaded" }).code(400));
          }

          // respond with collected results
          return resolve(h.response({ ok: true, results }).code(200));
        });

        // pipe request to busboy
        try {
          (request.raw as any).req.pipe(busboy);
        } catch (err) {
          console.error("pipe error", err);
          return resolve(h.response({ error: "Upload failed" }).code(500));
        }
      }); // end Promise
    },
  },
];

export default routes;
