// src/routes/download.ts
import { ServerRoute } from '@hapi/hapi';
import fs from 'fs';
import { validateAuth } from '../utils/auth';
import prisma from '../prisma/prisma.client';

const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: '/api/download',
    handler: async (request, h) => {
      const decoded = await validateAuth(request);
      if (!decoded) return h.response({ message: 'Unauthorized' }).code(401);

      const docIdRaw = request.query.docId as string | undefined;
      const docId = docIdRaw ? Number(docIdRaw) : NaN;
      if (!docId || Number.isNaN(docId)) return h.response({ message: 'Missing docId' }).code(400);

      const doc = await prisma.document.findUnique({ where: { id: docId } });
      if (!doc || doc.userId !== Number((decoded as any).userId)) return h.response({ message: 'Not found or forbidden' }).code(404);
      if (!fs.existsSync(doc.path)) return h.response({ message: 'File missing on server' }).code(410);

      return h.file(doc.path, { confine: false, filename: doc.filename });
    }
  }
];

export default routes;
