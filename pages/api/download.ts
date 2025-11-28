import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import prisma from "../../lib/prisma";
import { verifyAccess } from "../../lib/auth";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function parseAuth(req: NextApiRequest) {
  const header = (req.headers.authorization || "").toString();
  if (!header.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = header.replace("Bearer ", "");
  return verifyAccess(token) as any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { docId } = req.query;
    const payload = parseAuth(req);
    const userId = payload.sub;

    const doc = await prisma.document.findUnique({ where: { id: Number(docId) } });
    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ message: "Not found" });
    }

    const filePath = path.join(UPLOADS_DIR, doc.s3Key);
    const realPath = path.resolve(filePath);

    if (!realPath.startsWith(path.resolve(UPLOADS_DIR))) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(realPath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.setHeader("Content-Type", doc.contentType || "application/octet-stream");
    res.setHeader("Content-Length", doc.size || 0);
    res.setHeader("Content-Disposition", `attachment; filename="${doc.filename.replace(/"/g, '')}"`);

    const stream = fs.createReadStream(realPath);
    stream.pipe(res);

    stream.on("error", (err: any) => {
      console.error("stream error:", err.message);
      try {
        res.end();
      } catch (e) {
        // response already sent
      }
    });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.error("download:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}
