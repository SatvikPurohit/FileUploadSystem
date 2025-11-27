// pages/api/upload/server-upload.ts
import type { NextApiRequest, NextApiResponse } from "next";

import fs from "fs";
import formidable from "formidable";
import prisma from "../../../lib/prisma";
import { verifyAccess } from "../../../lib/auth";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";


export const config = {
  api: { bodyParser: false } // we will parse via formidable
};

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

async function parseForm(req: NextApiRequest) {
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    const form = new formidable.IncomingForm({ multiples: false });
    form.parse(req as any, (err: any, fields: any, files: any) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).end();
    const payload = parseAuth(req);
    const userId = payload.sub;

    const { fields, files } = await parseForm(req);
    // expecting form field 'bucket' and file under 'file'
    const bucket = String(fields.bucket || process.env.S3_BUCKET);
    const allowed = (process.env.ALLOWED_S3_BUCKETS || process.env.S3_BUCKET || "").split(",").map(s=>s.trim()).filter(Boolean);
    if (!allowed.includes(bucket)) return res.status(403).json({ message: "Bucket not allowed" });

    const file = files.file as unknown as File;
    if (!file) return res.status(400).json({ message: "Missing file" });

    // validate size/type if needed
    if (file.size && file.size > 10 * 1024 * 1024) return res.status(400).json({ message: "File too large" });

    // create DB row pending
    const key = `uploads/${userId}/${Date.now()}_${file.name}`;
    const doc = await prisma.document.create({
      data: { userId, filename: file.name!, s3Key: key, contentType: file.type || "application/octet-stream", size: Number(file.size), status: "uploading" }
    });

    // stream file to S3 using lib-storage Upload which accepts streams
    const fileStream = fs.createReadStream((file as any).filepath);
    const parallelUpload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileStream,
        ContentType: file.type || "application/octet-stream"
      },
      queueSize: 4, // concurrency for multipart
      partSize: 5 * 1024 * 1024, // 5MB
      leavePartsOnError: false
    });

    // optional: listen to events (progress available server-side)
    parallelUpload.on("httpUploadProgress", (progress) => {
      // you can log progress or push to ws; not used by client directly
      console.log("upload progress", progress);
    });

    await parallelUpload.done();

    // mark DB success
    await prisma.document.update({ where: { id: doc.id }, data: { status: "success", uploadedAt: new Date() } });

    // remove tmp file (formidable wrote it)
    try { fs.unlinkSync((file as any).filepath); } catch (e) {}

    res.status(200).json({ ok: true, docId: doc.id, key });
  } catch (err: any) {
    console.error("upload error", err);
    return res.status(500).json({ message: "Upload failed", detail: err.message });
  }
}
