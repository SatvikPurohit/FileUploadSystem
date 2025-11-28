# 🚀 Complete Setup Guide - Backend + Frontend Separation

## Project Status: ✅ COMPLETE

You now have a **fully separated architecture**:
- **Backend**: Node.js + Hapi + Prisma + SQLite (runs on port 4000)
- **Frontend**: React + Vite + Material-UI (runs on port 5173)
- **Database**: Shared SQLite file

---

## 📋 Quick Start (5 Minutes)

### Step 1: Root Setup
```bash
cd /home/satvikpurohit/Documents/workspace/FileUploadSystem
npm install
```

### Step 2: Backend Setup
```bash
npm run build:backend    # Install deps + Prisma setup
npm run seed             # Create demo user
```

### Step 3: Start Both
```bash
npm run dev
```

✅ **Done!** Visit:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000/api

**Demo Login:**
- Email: `demo@local.test`
- Password: `Password123!`

---

## 📂 What Was Created

### Backend Structure
```
backend/
├── server.js              ← Main Hapi server with routes
├── seed.js                ← Creates demo user
├── package.json           ← Dependencies: @hapi/*, Prisma, JWT, bcryptjs
├── .env.example           ← Environment template
├── prisma/
│   ├── schema.prisma      ← Database schema
│   └── dev.db             ← SQLite database
└── README.md              ← Backend docs
```

**Key Endpoints:**
- `POST /api/auth/login` — User login
- `POST /api/auth/refresh` — Refresh token
- `POST /api/upload` — Upload files
- `GET /api/download?docId=ID` — Download file

### Frontend Structure
```
frontend/
├── src/
│   ├── App.tsx                 ← Main app component (page routing)
│   ├── main.tsx                ← Entry point with MUI
│   ├── api/
│   │   └── client.ts           ← Axios client (auto-token, 401-refresh)
│   ├── hooks/
│   │   ├── useAuth.ts          ← Login/logout logic
│   │   └── useUpload.ts        ← File upload queue
│   ├── pages/
│   │   ├── Home.tsx            ← Landing page
│   │   ├── Login.tsx           ← Login form
│   │   └── Upload.tsx          ← Upload interface
│   └── components/
│       └── UploadQueue.tsx     ← File list + controls
├── package.json                ← Dependencies: React, Vite, MUI, axios
├── vite.config.ts
├── tsconfig.json
├── .env.local                  ← API URL config
└── README.md                   ← Frontend docs
```

### Root Changes
```
package.json             ← Simplified (orchestration only)
FULL_SETUP.md            ← Detailed setup guide
MIGRATION.md             ← What changed, migration details
```

---

## 🎯 Common Commands

### Development
```bash
npm run dev              # Start both backend + frontend
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
```

### Database
```bash
npm run seed             # Add demo user
npm run prisma:studio    # Open DB browser
```

### Building
```bash
npm run build            # Build both for production
npm run build:backend    # Backend build only
npm run build:frontend   # Frontend build only
```

---

## 🔧 Individual Setup (If You Want to Run Separately)

### Backend Alone
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```
Backend runs on http://localhost:4000

### Frontend Alone
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173

⚠️ **Note**: Frontend needs backend running on 4000. If backend is on different port, update `frontend/.env.local`:
```
VITE_API_URL=http://your-backend-url:port
```

---

## 🔐 How Authentication Works

1. **Login**: User enters email/password
   - Frontend calls `POST /api/auth/login`
   - Backend returns `{ access, refresh }` tokens
   - Frontend stores both in sessionStorage

2. **API Calls**: Frontend attaches access token
   - Axios interceptor adds `Authorization: Bearer <token>`
   - Backend verifies token before processing request

3. **Token Refresh**: When access token expires
   - Backend returns 401
   - Axios interceptor catches it
   - Frontend calls `POST /api/auth/refresh` with refresh token
   - Gets new access token
   - Retries original request

4. **Logout**: User logs out
   - Frontend clears sessionStorage
   - Tokens removed, API calls will 401

---

## 📤 How File Upload Works

1. **Select Files**: User picks files from file input
   - Frontend validates: type (PDF/DOCX/TXT) + size (max 10MB)
   - Invalid files show error immediately

2. **Upload Queue**: Files added to queue
   - Displayed in list with status (pending/uploading/success/error)
   - Progress bars show upload progress

3. **API Upload**: Frontend sends multipart form
   - `POST /api/upload` with file field
   - Backend receives, validates, saves to disk
   - Creates Document record in database

4. **Download**: User clicks download button
   - Frontend links to `GET /api/download?docId=ID`
   - Backend verifies user owns file
   - Serves file to user

---

## 🛠 Troubleshooting

### "Cannot find module" errors
```bash
# Make sure both frontend and backend are installed
cd frontend && npm install
cd backend && npm install
cd ..
```

### Backend won't start
```bash
# Port 4000 in use?
lsof -i :4000

# Regenerate Prisma
cd backend && npm run prisma:generate

# Reset database
rm prisma/dev.db backend/prisma/dev.db
npm run build:backend
npm run seed
```

### Frontend can't connect to backend
- Check backend is running: `curl http://localhost:4000` should show Hapi response
- Check `.env.local` has `VITE_API_URL=http://localhost:4000`
- Check browser console (F12) for CORS errors
- Backend has CORS enabled, should work

### File upload fails
- Check file type: PDF, DOCX, TXT only
- Check file size: max 10MB
- Check `public/uploads/` folder exists
- Check browser console for error messages

### "Can't connect to database"
```bash
# Recreate database
rm prisma/dev.db backend/prisma/dev.db
npm run build:backend
npm run seed
```

---

## 📖 Architecture Decisions

### Why Hapi?
- Lightweight, focused
- Great plugin system
- Good for APIs

### Why separate backend + frontend?
- **Scalability**: Can run on different servers
- **Maintainability**: Clear separation
- **Testing**: Easier to test independently
- **Deployment**: Can deploy to different platforms

### Why local filesystem for storage?
- **Simplicity**: No cloud credentials
- **Development**: Easy to test
- **Cost**: No storage fees
- **Privacy**: Files stay on your machine

### Why Vite over Create React App?
- **Speed**: Faster dev startup
- **Modern**: ES modules native
- **Simplicity**: Less overhead

### Why SQLite?
- **Development**: No setup, file-based
- **Simplicity**: Perfect for small to medium projects
- **Portability**: Easy to backup/share

---

## 🚀 Production Deployment

### Backend (Node.js)
```bash
# Build
cd backend
npm install --production
npm run prisma:generate

# Run
npm start
```

Deploy to:
- Heroku, Railway, Render, Fly.io, etc.

### Frontend (React + Vite)
```bash
# Build
cd frontend
npm run build

# Output: dist/

# Serve
npm run preview
```

Deploy to:
- Vercel, Netlify, Cloudflare Pages, etc.

---

## ✨ Features Implemented

✅ User authentication (JWT, access + refresh)
✅ File upload with progress
✅ File download with verification
✅ Auto-token refresh on 401
✅ File type validation
✅ File size limits
✅ Local file storage
✅ Material-UI components
✅ TypeScript throughout
✅ CORS for local dev
✅ Seed script for demo user

---

## 📝 Next Steps

- [ ] Add user registration
- [ ] Add tests (Jest, Vitest)
- [ ] Add file search/filter
- [ ] Add pagination
- [ ] Add document metadata UI
- [ ] Add drag-and-drop upload
- [ ] Containerize with Docker
- [ ] Deploy backend
- [ ] Deploy frontend

---

## 📚 Important Files to Know

| File | Purpose |
|------|---------|
| `backend/server.js` | Hapi server + routes |
| `backend/seed.js` | Demo user creation |
| `frontend/src/App.tsx` | Main component + routing |
| `frontend/src/api/client.ts` | Axios with auth |
| `frontend/src/hooks/useAuth.ts` | Login logic |
| `frontend/src/hooks/useUpload.ts` | Upload queue |
| `root/package.json` | Orchestration commands |
| `FULL_SETUP.md` | Detailed guide |
| `MIGRATION.md` | What changed |

---

## ❓ Questions?

Check these files first:
1. `FULL_SETUP.md` — Detailed setup guide
2. `MIGRATION.md` — Migration from Next.js
3. `backend/README.md` — Backend specific
4. `frontend/README.md` — Frontend specific

---

**Status**: ✅ Ready to develop or deploy!

Run `npm run dev` and start building! 🎉
