import { ServerRoute, Request, ResponseToolkit } from "@hapi/hapi";
import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";
import { FRONTEND_URL, UPLOADS_DIR } from "../config";
import mimeTypes from "mime-types";

const BusboyImport: any = require("busboy");

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
const allowed = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

type SavedFile = {
  fieldname: string;
  filename: string;
  savedTo: string;
  mimetype: string;
  size: number;
};

const route: ServerRoute = {
  method: "POST",
  path: "/api/upload",
  options: {
    cors: { origin: [FRONTEND_URL], credentials: true },
    payload: {
      output: "stream",
      parse: false,
      multipart: { output: "stream" },
      maxBytes: 200 * 1024 * 1024,
    },
    // ensure no pre-handlers that read the body
  },
  handler: async (request: Request, h: ResponseToolkit) => {
    const req = request.raw.req;

    if (!req || !req.headers) {
      return h.response({ ok: false, error: "Invalid request" }).code(400);
    }

    // ------------------ prepare upload dir, local disk -----------------
    const uploadsDir = path.resolve(
      UPLOADS_DIR || path.join(process.cwd(), "uploads")
    );
    await mkdirp(uploadsDir);

    // content-type guard
    const contentTypeHeader = (req.headers["content-type"] ||
      req.headers["Content-Type"] ||
      "") as string;
    const contentType = String(contentTypeHeader).toLowerCase();
    if (!contentType.startsWith("multipart/form-data")) {
      return h
        .response({
          ok: false,
          error: "Unsupported content-type. Expected multipart/form-data",
        })
        .code(415);
    }

    // ------------------ busboy initialization -----------------
    let busboy: any;
    try {
      if (typeof BusboyImport === "function") {
        try {
          busboy = new BusboyImport({ headers: req.headers });
        } catch (eNew) {
          busboy = BusboyImport({ headers: req.headers });
        }
      } else if (BusboyImport && typeof BusboyImport.default === "function") {
        try {
          busboy = new BusboyImport.default({ headers: req.headers });
        } catch (eNew) {
          busboy = BusboyImport.default({ headers: req.headers });
        }
      } else {
        throw new Error("Unsupported busboy import shape");
      }
    } catch (err) {
      console.error("Failed to construct Busboy:", err);
      return h
        .response({ ok: false, error: "Upload initialization failed" })
        .code(500);
    }

    //  ----------------- file saving and parsing logic -----------------
    const filesSaved: SavedFile[] = [];
    const fields: Record<string, string> = {};
    let aborted = false;
    let busboyError: Error | null = null;

    busboy.on(
      "file",
      (
        fieldname: string,
        fileStream: NodeJS.ReadableStream & any,
        arg3: any,
        arg4?: any,
        arg5?: any
      ) => {
        // Support both old and new Busboy shapes
        let filename: string | undefined;
        let encoding: string | undefined;
        let mimetype: string | undefined;

        if (typeof arg3 === "string") {
          // old signature
          filename = arg3;
          encoding = arg4 as string | undefined;
          mimetype = arg5 as string | undefined;
        } else if (arg3 && typeof arg3 === "object") {
          // new signature: info object
          filename = arg3.filename || arg3.fileName || arg3.name;
          encoding = arg3.encoding || arg3.transferEncoding;
          mimetype = arg3.mimeType || arg3.mimetype || arg3["content-type"];
        }

        filename = filename ? String(filename) : "";

        // fallback to lookup by extension
        if (!mimetype || mimetype === "application/octet-stream") {
          const lookedUp = mimeTypes.lookup(filename);
          if (lookedUp) mimetype = String(lookedUp);
        }

        console.log("upload:file", { fieldname, filename, encoding, mimetype });

        if (!filename) {
          fileStream.resume?.();
          return;
        }

        if (!mimetype) {
          busboyError =
            busboyError ||
            new Error("Unsupported file type: unknown (no mimetype)");
          fileStream.resume?.();
          return;
        }

        if (!allowed.has(mimetype)) {
          busboyError =
            busboyError || new Error(`Unsupported file type: ${mimetype}`);
          fileStream.resume?.();
          return;
        }

        const safeName = path.basename(filename);
        const saveTo = path.join(uploadsDir, `${Date.now()}-${safeName}`);
        const writeStream = fs.createWriteStream(saveTo);
        let fileBytes = 0;

        fileStream.on("data", (chunk: Buffer) => {
          fileBytes += chunk.length;
          if (fileBytes > MAX_BYTES) {
            const sizeErr = new Error("File size limit exceeded");
            busboyError = busboyError || sizeErr;
            try {
              fileStream.unpipe?.(writeStream);
            } catch (e) {}
            writeStream.destroy(sizeErr);
            fileStream.destroy?.(sizeErr);
          }
        });

        fileStream.on("error", (err: Error) => {
          busboyError = busboyError || err;
        });
        writeStream.on("error", (err: Error) => {
          busboyError = busboyError || err;
        });

        writeStream.on("close", () => {
          if (!aborted && !busboyError) {
            filesSaved.push({
              fieldname,
              filename,
              savedTo: saveTo,
              mimetype,
              size: fileBytes,
            });
          } else {
            try {
              if (fs.existsSync(saveTo)) fs.unlinkSync(saveTo);
            } catch (_) {}
          }
        });

        fileStream.pipe(writeStream); // write to disk from read stream also can use .pipeline() 
      }
    );

    busboy.on("field", (name: string, val: string) => {
      fields[String(name)] = val;
    });
    busboy.on("error", (err: Error) => {
      console.error("busboy error event:", err);
      busboyError = busboyError || err;
    });

    req.on("aborted", () => {
      aborted = true;
      busboyError = busboyError || new Error("Request aborted by client");
      try {
        (busboy as any).destroy?.();
      } catch (e) {}
      console.warn("request aborted by client");
    });

    // Keep the request “open”
// Stream file data for minutes if needed
//  Wait for Busboy to finish parsing multipart
    return new Promise((resolve) => {
      busboy.on("finish", () => {
        if (aborted)
          return resolve(
            h.response({ ok: false, error: "upload aborted" }).code(499)
          );
        if (busboyError) {
          try {
            filesSaved.forEach((f) => {
              if (fs.existsSync(f.savedTo)) fs.unlinkSync(f.savedTo);
            });
          } catch (_) {}
          console.error("upload failed:", busboyError);
          return resolve(
            h
              .response({
                ok: false,
                error: busboyError.message || "upload failed",
              })
              .code(400)
          );
        }
        return resolve(
          h.response({ ok: true, files: filesSaved, fields }).code(200)
        );
      });

      busboy.on("error", (err: Error) => {
        console.error("busboy on error (promise):", err);
        busboyError = busboyError || err;
        return resolve(h.response({ ok: false, error: err.message }).code(500));
      });

      try {
        req.pipe(busboy);
      } catch (err) {
        console.error("req.pipe(busboy) threw:", err);
        busboyError = busboyError || (err as Error);
        return resolve(
          h.response({ ok: false, error: "Failed to process upload" }).code(500)
        );
      }
    });
  },
};

export default route;
