Backend (Hapi + Prisma + SQLite)

Quick start:

1. Copy the DB file from the root to backend/prisma/dev.db or point DATABASE_URL to the root `prisma/dev.db`.

2. Copy `.env.example` to `.env` and set values.

3. Install deps:

```bash
cd backend
npm install
```

4. Generate Prisma client and migrate (if needed):

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start server:

```bash
npm run dev
```

Server runs on port defined in `.env` (default 4000).

Notes:
- Endpoints:
  - POST /api/auth/login { email, password }
  - POST /api/auth/refresh { refresh }
  - POST /api/upload (multipart form-data, field name `file`)
- Uploads stored in `public/uploads/` by default.
- The backend uses the Prisma schema.
