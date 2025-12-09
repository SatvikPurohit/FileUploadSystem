# File Upload System

**[Backend Docs](backend/README.md)** | **[Frontend Docs](frontend/README.md)** | **[Security Architecture](ARCHITECTURE.md)**

## Architecture

- **Backend**: Node.js + Hapi + Prisma + SQLite (port 4000)
- **Frontend**: React + Vite + Material-UI (port 5173)
- **Database**: SQLite 
- **Storage**: Local filesystem (`public/uploads/`)

## Quick start (both at once)

```bash
# install dependencies in both backend and frontend
npm install

# setup backend
npm run build:backend

# setup frontend
npm run build:frontend

# seed db demo user
npm run seed

# start both backend and frontend (requires concurrently)
npm install -g concurrently  
npm run dev
```

Then:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

Demo login:
- Email: `fus@gmail.com`
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

Backend should be running on port 4000 for frontend.

## Commands

- `npm run dev` — start both backend and frontend
- `npm run dev:backend` — backend only
- `npm run dev:frontend` — frontend only
- `npm run build` — build both (install deps, generate Prisma, build frontend)
- `npm run seed` — add fus@gmail.com user
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

## Security Features

For a comprehensive understanding of the security architecture, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

Key security features:
- **Dual-token system**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **Password security**: bcrypt hashing with 10 salt rounds
- **Token storage**: Refresh token hashes stored in database (SHA-256)
- **HttpOnly cookies**: Prevents XSS attacks from stealing tokens
- **CSRF protection**: Token-based verification for state-changing operations
- **Token revocation**: Logout invalidates all user sessions
- **Token rotation**: Refresh tokens replaced on login

## troubleshooting

**"Cannot find module" errors on npm run dev**
- Make sure both `npm install` in root and within `backend/` and `frontend/`

**Backend won't start**
- Check port 4000 is free
- Run `npm run seed` to create demo user

**Frontend can't connect to backend**
- Verify backend is running on 4000
- Check `.env.local` has `VITE_API_URL=http://localhost:4000`
- Check browser console for CORS errors (should be allowed by default)

**Database clean up**
- Delete `prisma/dev.db` (or `backend/prisma/dev.db`)
- Run `npm run build:backend` to recreate
- Run `npm run seed` to add demo user

