// pages/api/upload/server-upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import formidable from "formidable";
import prisma from "../../../lib/prisma";
import { verifyAccess } from "../../../lib/auth";

export const config = {
  api: { bodyParser: false } // we will parse via formidable
};

// Local uploads directory
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
    const file = files.file as unknown as File;
    if (!file) return res.status(400).json({ message: "Missing file" });

    // validate size if needed
    if (file.size && file.size > 10 * 1024 * 1024) return res.status(400).json({ message: "File too large" });

    // create DB row pending
    const timestamp = Date.now();
    const filename = file.name || `file_${timestamp}`;
    const localPath = `uploads/${userId}/${timestamp}_${filename}`;
    const fullPath = path.join(UPLOADS_DIR, `${userId}`);
    
    // ensure user upload dir exists
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    const doc = await prisma.document.create({
      data: {
        userId,
        filename,
        s3Key: localPath, // reuse s3Key field to store local path
        contentType: file.type || "application/octet-stream",
        size: Number(file.size),
        status: "uploading"
      }
    });

    // copy file to uploads directory
    const destPath = path.join(fullPath, `${timestamp}_${filename}`);
    await fs.promises.copyFile((file as any).filepath, destPath);

    // mark DB success
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "success", uploadedAt: new Date() }
    });

    // remove tmp file (formidable wrote it)
    try { fs.unlinkSync((file as any).filepath); } catch (e) {}

    res.status(200).json({ ok: true, docId: doc.id, key: localPath });
  } catch (err: any) {
    console.error("upload error", err);
    return res.status(500).json({ message: "Upload failed", detail: err.message });
  }
}
