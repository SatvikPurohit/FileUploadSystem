require('dotenv').config();
const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 4000;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads');

async function validateAuth(request) {
  const auth = request.headers.authorization;
  if (!auth) return null;
  const m = /^Bearer (.+)$/.exec(auth);
  if (!m) return null;
  try {
    const decoded = jwt.verify(m[1], JWT_SECRET);
    return decoded;
  } catch (e) {
    return null;
  }
}

async function start() {
  const server = Hapi.server({ 
    port: PORT, 
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000']
      }
    }
  });
  await server.register(Inert);

  server.route({
    method: 'POST',
    path: '/api/auth/login',
    handler: async (request, h) => {
      const payload = request.payload || {};
      // Hapi does not parse JSON automatically for raw content when using default config here; we'll accept JSON body
      const body = typeof payload === 'object' ? payload : JSON.parse(request.payload);
      const { email, password } = body;
      if (!email || !password) return h.response({ message: 'Missing credentials' }).code(400);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return h.response({ message: 'Invalid credentials' }).code(401);
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return h.response({ message: 'Invalid credentials' }).code(401);
      const access = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
      const refresh = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      // store refresh hash (simple)
      const hash = await bcrypt.hash(refresh, 8);
      await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: hash } });
      return { access, refresh };
    }
  });

  server.route({
    method: 'POST',
    path: '/api/auth/refresh',
    handler: async (request, h) => {
      const { refresh } = request.payload || {};
      if (!refresh) return h.response({ message: 'Missing refresh token' }).code(400);
      try {
        const decoded = jwt.verify(refresh, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || !user.refreshTokenHash) return h.response({ message: 'Invalid' }).code(401);
        const ok = await bcrypt.compare(refresh, user.refreshTokenHash);
        if (!ok) return h.response({ message: 'Invalid' }).code(401);
        const access = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
        return { access };
      } catch (e) {
        return h.response({ message: 'Invalid' }).code(401);
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/api/upload',
    options: {
      payload: {
        output: 'stream',
        parse: false,
        maxBytes: 20 * 1024 * 1024
      }
    },
    handler: async (request, h) => {
      const decoded = await validateAuth(request);
      if (!decoded) return h.response({ message: 'Unauthorized' }).code(401);

      const form = formidable({ multiples: true });

      return new Promise((resolve, reject) => {
        form.parse(request.raw.req, async (err, fields, files) => {
          if (err) return resolve(h.response({ message: 'Upload error' }).code(500));
          const fileList = Array.isArray(files.file) ? files.file : [files.file];
          const results = [];
          for (const f of fileList) {
            if (!f) continue;
            const userDir = path.join(UPLOADS_DIR, String(decoded.userId));
            await mkdirp(userDir);
            const ts = Date.now();
            const name = `${ts}_${f.originalFilename}`.replace(/[^a-zA-Z0-9-_.]/g, '_');
            const destPath = path.join(userDir, name);
            const readStream = fs.createReadStream(f.filepath || f.path);
            const writeStream = fs.createWriteStream(destPath);
            await new Promise((res, rej) => {
              readStream.pipe(writeStream);
              writeStream.on('finish', res);
              writeStream.on('error', rej);
            });
            const doc = await prisma.document.create({ data: {
              userId: decoded.userId,
              filename: f.originalFilename || name,
              path: destPath,
              contentType: f.mimetype || 'application/octet-stream',
              size: f.size || 0,
              uploadedAt: new Date(),
              status: 'success'
            }});
            results.push({ id: doc.id, filename: doc.filename });
          }
          return resolve({ ok: true, results });
        });
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/api/download',
    handler: async (request, h) => {
      const decoded = await validateAuth(request);
      if (!decoded) return h.response({ message: 'Unauthorized' }).code(401);
      const docId = Number(request.query.docId);
      if (!docId) return h.response({ message: 'Missing docId' }).code(400);
      const doc = await prisma.document.findUnique({ where: { id: docId } });
      if (!doc || doc.userId !== decoded.userId) return h.response({ message: 'Not found or forbidden' }).code(404);
      if (!fs.existsSync(doc.path)) return h.response({ message: 'File missing on server' }).code(410);
      return h.file(doc.path, { confine: false, filename: doc.filename });
    }
  });

  // static serve uploads (optional)
  server.route({
    method: 'GET',
    path: '/uploads/{param*}',
    handler: {
      directory: {
        path: UPLOADS_DIR,
        listing: false,
        index: false
      }
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
