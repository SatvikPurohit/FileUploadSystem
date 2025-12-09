# File Upload System

**[Backend Docs](backend/README.md)** | **[Frontend Docs](frontend/README.md)**

---

## 📚 Interview Preparation & Learning Resources

Comprehensive documentation for learning about this project from basics to professional level:

- **[📖 INTERVIEW GUIDE](INTERVIEW_GUIDE.md)** - Complete learning path from basics to pro (start here!)
  - Learning roadmap (8 weeks: beginner → expert)
  - Simple analogies for complex concepts
  - Code walkthroughs with explanations
  - Common interview questions with answers
  - What interviewers might ask you to change

- **[🏗️ ARCHITECTURE](ARCHITECTURE.md)** - In-depth technical documentation
  - System architecture diagrams
  - Technology stack deep dive
  - Data flow explanations
  - Database schema details
  - API endpoints reference
  - Security measures
  - Performance optimizations

- **[❓ COMMON INTERVIEW QUESTIONS](COMMON_INTERVIEW_QUESTIONS.md)** - Q&A format
  - 20+ common questions with detailed answers
  - Organized by difficulty (basic, intermediate, advanced)
  - Scenario-based questions
  - Code examples and explanations
  - Trade-offs and alternatives

- **[🚀 IMPROVEMENTS & ENHANCEMENTS](IMPROVEMENTS_AND_ENHANCEMENTS.md)** - Scalability discussions
  - Cloud storage migration (AWS S3)
  - PostgreSQL migration
  - Caching strategies (Redis)
  - Load balancing
  - Security enhancements (virus scanning, rate limiting)
  - Performance optimizations (compression, CDN)
  - Complete implementation examples

- **[⚡ QUICK REFERENCE](QUICK_REFERENCE.md)** - Cheat sheet for interview day
  - 30-second project pitch
  - Key numbers to remember
  - Must-know flows
  - Common questions quick answers
  - Code snippets
  - Interview tips

> 💡 **Tip**: Start with the [INTERVIEW GUIDE](INTERVIEW_GUIDE.md) for a structured learning path, then dive into [ARCHITECTURE](ARCHITECTURE.md) for technical details. Use [QUICK REFERENCE](QUICK_REFERENCE.md) for last-minute review before interviews.

---

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

