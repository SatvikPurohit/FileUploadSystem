import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import formidable from "formidable";
import prisma from "../../../lib/prisma";
import { verifyAccess } from "../../../lib/auth";

export const config = {
  api: { bodyParser: false }
};

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

function parseForm(req: NextApiRequest) {
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    const form = new formidable.IncomingForm({ multiples: false });
    form.parse(req as any, (err: any, fields: any, files: any) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const payload = parseAuth(req);
    const userId = payload.sub;

    const { fields, files } = await parseForm(req);
    const file = files.file as unknown as File;
    
    if (!file) return res.status(400).json({ message: "Missing file" });
    if (file.size && file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "File exceeds 10MB limit" });
    }

    const timestamp = Date.now();
    const filename = file.name || `file_${timestamp}`;
    const localPath = `uploads/${userId}/${timestamp}_${filename}`;
    const userDir = path.join(UPLOADS_DIR, userId);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const doc = await prisma.document.create({
      data: {
        userId,
        filename,
        s3Key: localPath,
        contentType: file.type || "application/octet-stream",
        size: Number(file.size),
        status: "uploading"
      }
    });

    const destPath = path.join(userDir, `${timestamp}_${filename}`);
    await fs.promises.copyFile((file as any).filepath, destPath);

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "success", uploadedAt: new Date() }
    });

    try {
      fs.unlinkSync((file as any).filepath);
    } catch (e) {
      // tmp file cleanup not critical
    }

    res.status(200).json({ ok: true, docId: doc.id, key: localPath });
  } catch (err: any) {
    console.error("upload:", err.message);
    res.status(500).json({ message: "Upload failed", detail: err.message });
  }
}
