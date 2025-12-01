import { IncomingMessage } from "http";

const BusboyImport: any = require("busboy");


export const getLibToUplad = (req: IncomingMessage) => {
  if (!req || !req.headers) {
    throw new Error("Invalid request or missing headers");
  }

  const contentTypeHeader = (req.headers["content-type"] ||
    req.headers["Content-Type"] ||
    "") as string;
  const contentType = String(contentTypeHeader).toLowerCase();

  if (!contentType.startsWith("multipart/form-data")) {
    throw new Error(
      `Unsupported content-type: ${contentType}. Expected multipart/form-data`
    );
  }

  // Try multiple shapes (constructor, callable factory, .default)
  try {
    if (typeof BusboyImport === "function") {
      try {
        return new BusboyImport({ headers: req.headers });
      } catch (e) {
        return BusboyImport({ headers: req.headers });
      }
    } else if (BusboyImport && typeof BusboyImport.default === "function") {
      try {
        return new BusboyImport.default({ headers: req.headers });
      } catch (e) {
        return BusboyImport.default({ headers: req.headers });
      }
    } else {
      throw new Error("Unsupported busboy import shape");
    }
  } catch (err: any) {
    // normalize to Error
    throw new Error(
      "Failed to construct Busboy: " + (err && err.message ? err.message : err)
    );
  }
};

export default getLibToUplad;
