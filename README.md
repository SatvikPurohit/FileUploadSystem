# File Upload System

**[Backend Docs](backend/README.md)** | **[Frontend Docs](frontend/README.md)**

## Architecture

- **Backend**: Node.js + Hapi + Prisma + SQLite (port 4000)
- **Frontend**: React + Vite + Material-UI (port 5173)
- **Database**: SQLite shared between projects
- **Storage**: Local filesystem (`public/uploads/`)

## Quick start (both at once)

```bash
# install dependencies in both backend and frontend
npm install

# setup database
npm run build:backend

# seed demo user
npm run seed

# start both backend and frontend (requires concurrently)
npm install -g concurrently  # if you don't have it
npm run dev
```

Then:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

Demo login:
- Email: `demo@local.test`
- Password: `Password123!`

## individual development

### Backend only

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate    # setup DB
npm run seed              # add demo user
npm run dev               # start server on 4000
```

### Frontend only

```bash
cd frontend
npm install
npm run dev               # start dev server on 5173
```

Make sure backend is running on port 4000 when developing frontend.

## Commands

- `npm run dev` — start both backend and frontend
- `npm run dev:backend` — backend only
- `npm run dev:frontend` — frontend only
- `npm run build` — build both (install deps, generate Prisma, build frontend)
- `npm run seed` — add demo@local.test user
- `npm run prisma:studio` — open Prisma Studio to view/edit database



## features

- login with email/password
- token-based auth (JWT, access + refresh)
- multi-file upload to local filesystem
- file type validation (PDF, DOCX, TXT only)
- 10MB per file max
- progress bars
- download files by docId
- auto-logout on 401
- all files stored locally in `public/uploads/<userId>/`

## troubleshooting

**"Cannot find module" errors on npm run dev**
- Make sure both `npm install` in root and within `backend/` and `frontend/`

**Backend won't start**
- Check port 4000 is free
- Run `npm run seed` to create demo user
- Check `.env` has DATABASE_URL set correctly

**Frontend can't connect to backend**
- Verify backend is running on 4000
- Check `.env.local` has `VITE_API_URL=http://localhost:4000`
- Check browser console for CORS errors (should be allowed by default)

**Database messed up**
- Delete `prisma/dev.db` (or `backend/prisma/dev.db`)
- Run `npm run build:backend` to recreate
- Run `npm run seed` to add demo user

## next steps

- Add tests (Jest for backend, Vitest for frontend)
- Add user registration
- Add document metadata (file size, upload date, etc.)
- Add file search/filtering
- Add pagination
- Deploy to production (Docker, cloud host, etc.)
