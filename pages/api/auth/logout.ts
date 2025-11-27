// pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { verifyAccess } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  try {
    const payload: any = verifyAccess(token);
    await prisma.user.update({ where: { id: payload.sub }, data: { refreshTokenHash: null } });
  } catch {
    // ignore
  }
  res.setHeader("Set-Cookie", `refresh=; HttpOnly; Path=/api/auth/refresh; Max-Age=0; SameSite=Lax`);
  return res.status(200).json({ ok: true });
}
