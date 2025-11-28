import { ServerRoute } from "@hapi/hapi";
import formidable, { File } from "formidable";
import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";
import { UPLOADS_DIR } from "../config";
import { validateAuth } from "../utils/auth";
import prisma from "../prisma/prisma.client";

const routes: ServerRoute[] = [
  {
    method: "POST",
    path: "/api/upload",
    options: {
      payload: {
        output: "stream",
        parse: false,
        maxBytes: 20 * 1024 * 1024,
      },
    },
    handler: async (request, h) => {
      // AUTH CHECK
      const decoded = await validateAuth(request);
      if (!decoded) {
        return h.response({ message: "Unauthorized" }).code(401);
      }

      // FORMIDABLE INSTANCE
      const form = new formidable.IncomingForm({
        multiples: true,
        maxFileSize: 20 * 1024 * 1024,
      });

      console.log("[upload] incoming headers:", request.raw.req.headers);

      return await new Promise((resolve) => {
        form.on("error", (err) => {
          console.error("[upload] formidable error event:", err);
        });

        form.parse(request.raw.req, async (err, _fields, files) => {
          if (err) {
            console.error("[upload] formidable parse error:", err);
            return resolve(
              h
                .response({
                  message: "Upload parse error",
                  error: String(err?.message || err),
                })
                .code(415)
            );
          }

          // ---- FLEXIBLE FILE COLLECTION ----
          const fileArray: File[] = [];
          for (const key of Object.keys(files || {})) {
            const val = (files as any)[key];
            if (!val) continue;
            if (Array.isArray(val)) fileArray.push(...val);
            else fileArray.push(val);
          }

          console.log(
            "[upload] parsed files count:",
            fileArray.length,
            "keys:",
            Object.keys(files || {})
          );

          const results: any[] = [];

          for (const f of fileArray) {
            if (!f) continue;

            // per-user directory
            const userDir = path.join(
              UPLOADS_DIR,
              String((decoded as any).userId)
            );
            await mkdirp(userDir);

            const ts = Date.now();
            const originalFilename =
              (f as any).originalFilename ??
              (f as any).newFilename ??
              (f as any).name ??
              `file_${ts}`;

            const safeName = `${ts}_${originalFilename}`.replace(
              /[^a-zA-Z0-9-_.]/g,
              "_"
            );
            const destPath = path.join(userDir, safeName);

            const sourcePath =
              (f as any).filepath ?? (f as any).path ?? (f as any).file;

            if (!sourcePath || typeof sourcePath !== "string") {
              console.error(
                "[upload] invalid source path for file:",
                originalFilename,
                f
              );
              results.push({
                error: "invalid_source",
                filename: originalFilename,
              });
              continue;
            }

            const readStream = fs.createReadStream(sourcePath);
            const writeStream = fs.createWriteStream(destPath);

            try {
              await new Promise<void>((res, rej) => {
                readStream.pipe(writeStream);
                writeStream.on("finish", () => res());
                writeStream.on("error", (e) => rej(e));
                readStream.on("error", (e) => rej(e));
              });

              const doc = await prisma.document.create({
                data: {
                  userId: Number((decoded as any).userId),
                  filename: originalFilename,
                  path: destPath,
                  contentType:
                    (f as any).mimetype ?? "application/octet-stream",
                  size: Number((f as any).size ?? 0),
                  uploadedAt: new Date(),
                  status: "success",
                },
              });

              results.push({ id: doc.id, filename: doc.filename });
            } catch (e) {
              console.error(
                "[upload] save error for file:",
                originalFilename,
                e
              );
              results.push({ error: "failed", filename: originalFilename });
            }
          }

          return resolve({ ok: true, results });
        });
      });
    },
  },
];

export default routes;
