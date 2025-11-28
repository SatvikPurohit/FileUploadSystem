import { ServerRoute } from '@hapi/hapi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

type LoginPayload = {
  email?: string;
  password?: string;
};

const routes: ServerRoute[] = [
  {
    method: 'POST',
    path: '/api/auth/login',
    handler: async (request, h) => {
      const payload = request.payload as LoginPayload;
      const { email, password } = payload || {};
      if (!email || !password) {
        return h.response({ message: 'Missing credentials' }).code(400);
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return h.response({ message: 'Invalid credentials' }).code(401);
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return h.response({ message: 'Invalid credentials' }).code(401);

      const access = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
      const refresh = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const hash = await bcrypt.hash(refresh, 8);
      await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: hash } });

      return { access, refresh };
    }
  },

  {
    method: 'POST',
    path: '/api/auth/refresh',
    handler: async (request, h) => {
      const body = (request.payload as any) || {};
      const { refresh } = body;
      if (!refresh) return h.response({ message: 'Missing refresh token' }).code(400);
      try {
        const decoded = jwt.verify(refresh, JWT_SECRET) as { userId: number };
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || !user.refreshTokenHash) return h.response({ message: 'Invalid' }).code(401);
        const ok = await bcrypt.compare(refresh, user.refreshTokenHash);
        if (!ok) return h.response({ message: 'Invalid' }).code(401);
        const access = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
        return { access };
      } catch {
        return h.response({ message: 'Invalid' }).code(401);
      }
    }
  }
];

export default routes;
