import { NextApiRequest, NextApiResponse } from "next";
import { verifyTokenHash, signAccess, hashToken, createRefreshToken, REFRESH_TTL_SEC } from "../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }
  const user = await prisma.user.findFirst({
    where: {
      refreshTokenHash: { not: null },
    },
  });
  if (!user) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
  const valid = await verifyTokenHash(user.refreshTokenHash, refreshToken);
  if (!valid) {
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null }});
    res.setHeader("Set-Cookie", `refresh=; HttpOnly; Path=/api/auth/refresh; Max-Age=0; SameSite=Lax${process.env.NODE_ENV==='production'?'; Secure':''}`);
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const newRefresh = createRefreshToken();
  const newHash = await hashToken(newRefresh);
  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: newHash }});
  
  const accessToken = signAccess({ sub: user.id, email: user.email });
  res.setHeader("Set-Cookie", `refresh=${newRefresh}; HttpOnly; Path=/api/auth/refresh; Max-Age=${REFRESH_TTL_SEC}; SameSite=Lax${process.env.NODE_ENV==='production'?'; Secure':''}`);
  return res
    .status(200)
    .json({ access: accessToken, user: { id: user.id, email: user.email } });
}
