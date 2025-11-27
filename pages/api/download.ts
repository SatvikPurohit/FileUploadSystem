// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import prisma from "../../lib/prisma";
import { verifyAccess } from "../../lib/auth";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  },
  forcePathStyle: !!process.env.S3_ENDPOINT
});

function parseAuth(req: NextApiRequest) {
  const header = (req.headers.authorization || "").toString();
  if (!header.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = header.replace("Bearer ", "");
  return verifyAccess(token) as any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return res.status(405).end();
    const { bucket, key, docId } = req.query;

    // auth
    const payload = parseAuth(req);
    const userId = payload.sub;

    // Validate requested bucket
    const allowed = (process.env.ALLOWED_S3_BUCKETS || process.env.S3_BUCKET || "").split(",").map(s=>s.trim()).filter(Boolean);
    if (!bucket || !allowed.includes(String(bucket))) return res.status(403).json({ message: "Bucket not allowed" });

    // Validate ownership: if docId provided, check DB row; else try to look up doc by s3 key
    let doc;
    if (docId) {
      doc = await prisma.document.findUnique({ where: { id: Number(docId) } });
    } else {
      doc = await prisma.document.findFirst({ where: { s3Key: String(key), userId } });
    }
    if (!doc || doc.userId !== userId) return res.status(404).json({ message: "Not found or access denied" });

    // stream object from S3
    const getCmd = new GetObjectCommand({ Bucket: String(bucket), Key: String(key) });
    const data = await s3.send(getCmd);

    // Forward headers for content-type, length, disposition
    if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
    if (data.ContentLength) res.setHeader("Content-Length", String(data.ContentLength));
    // suggest filename
    res.setHeader("Content-Disposition", `attachment; filename="${doc.filename.replace(/"/g, '')}"`);

    // pipe the body stream to response
    const body = data.Body as any; // Readable stream
    body.pipe(res);
    body.on("error", (err: any) => {
      console.error("S3 stream error", err);
      try { res.end(); } catch(e) {}
    });
  } catch (err: any) {
    console.error(err);
    if (err.message === "Unauthorized") return res.status(401).json({ message: "Unauthorized" });
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
}
