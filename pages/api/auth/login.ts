import { NextApiRequest, NextApiResponse } from "next";
import {
    createRefreshToken,
    hashToken,
    REFRESH_TTL_SEC,
    signAccess,
} from "../../../lib/auth";
import bcrypt from "bcrypt";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ message: "Invalid email" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ message: "Invalid password" });
    }

    const accessToken = signAccess({ sub: user.id, email: user.email });

    const refreshToken = createRefreshToken();
    const refreshTokenHash = await hashToken(refreshToken);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash },
    });

    res.setHeader(
        "Set-Cookie",
        `refreshToken=${refreshToken}; HttpOnly; Path=/api/auth/refresh; Max-Age=${REFRESH_TTL_SEC}; SameSite=Strict; Secure`
    );

    return res.status(200).json({ access: accessToken, user: { id: user.id, email: user.email } });
}
