# 📤 File Upload System

A dead simple app to upload files, keep them on your machine, and grab them back whenever you need them. Built with Next.js, React, and Material-UI. Clean UI. No BS.

**👉 [Quick Start Guide](QUICKSTART.md)** — Get running in 5 minutes!

## What's it do?

- **Sign in** — quick login, done
- **Upload files** — pick one or more, they get saved locally
- **Watch progress** — real-time bars showing what's happening
- **Download anytime** — grab your files back whenever
- **Easy controls** — retry, cancel, download — all right there
- **Looks nice** — modern interface with smooth animations

That's it, really.

## Quick Start

### Need these
- Node.js (v16+)
- npm or yarn

### Get it running

1. **Download the code**
   ```bash
   cd FileUploadSystem
   ```

2. **Install stuff**
   ```bash
   npm install
   ```

3. **Set up database**
   ```bash
   npx prisma migrate dev
   ```
   Creates a SQLite database with a demo user ready to go

4. **Start it up**
   ```bash
   npm run dev
   ```
   Then go to `http://localhost:3000`

5. **Log in**
   - Email: `demo@local.test`
   - Password: `Password123!`

Done. You're in.

## How to use it

### Landing page
- Two big buttons: Upload or Login
- Nice cards with hover effects
- Demo credentials at the bottom

### Upload your stuff
- Click "Upload Files"
- Hit "+ Pick Files" and choose what you want
- Watch it upload with a progress bar
- Once done, download it or try again if something broke
- "Stop All" kills everything if you change your mind

### Get your files back
- On the upload page, find what you uploaded
- Click "Download" next to it
- Done

### Stay logged in
- You stay signed in while you're using it
- Stored in your browser, so if you close and come back, you're still there

### Where do files go?
- Saved in `public/uploads/` on your computer
- Each user gets their own folder
- Everything stays local — nothing goes to the cloud
- Files stick around until you delete them

## What's inside

```
FileUploadSystem/
├── app/                              
│   ├── components/UploadQueue.tsx    # The upload UI
│   ├── login/page.tsx                # Login form
│   ├── health/page.tsx               # System status
│   ├── page.tsx                      # Home page
│   ├── globals.css                   # Base styles
│   └── layout.tsx                    # App wrapper
├── pages/
│   ├── api/
│   │   ├── upload/server-upload.ts   # Handles uploads
│   │   ├── download.ts               # Serves files
│   │   └── auth/
│   │       ├── login.ts              
│   │       ├── logout.ts             
│   │       └── refresh.ts            
│   ├── _app.tsx                      # Global setup
│   └── upload.tsx                    # Upload page
├── prisma/
│   ├── schema.prisma                 # Database setup
│   └── dev.db                        # The actual database
├── hooks/
│   └── useServerUploadQueue.tsx       # Upload logic
├── lib/
│   ├── auth.ts                       # Login stuff
│   └── prisma.ts                     # Database connection
└── public/uploads/                   # Your files go here
```

## What we're using

- **Next.js 16** — the web framework
- **React 19** — makes the UI
- **Material-UI** — pre-made components that look good
- **Emotion** — makes the styling work
- **Prisma** — talks to the database
- **SQLite** — local database
- **Axios** — sends requests
- **Formidable** — handles file uploads
- **JWT** — keeps you logged in securely

## Customize it

Make a `.env.local` file if you want to change stuff:

```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-here"
```

By default it just works, but if you need custom settings, those are the ones.

## Useful commands

### Add more users
```bash
npx prisma db seed
```

### See what's in the database
```bash
npx prisma studio
```
Opens a web UI where you can see and change everything.

### Start over
```bash
rm prisma/dev.db
npx prisma migrate dev
```

### Make it for real (production)
```bash
npm run build
npm start
```

## Stuck? Check this

**Files won't upload?**
- Make sure you're logged in
- Check if `public/uploads/` exists (made automatically)
- Open browser console (F12) and look for red errors
- Make sure you can write to that folder

**Can't log in?**
- Try: `demo@local.test` / `Password123!`
- Or add your own user in Prisma Studio

**Port 3000 is taken?**
- It'll try another port automatically
- Or kill whatever's using 3000

**Database messed up?**
- Delete `prisma/dev.db` and run `npx prisma migrate dev` again
- This resets everything and makes a fresh database

**Stuff looks broken?**
- Clear cache: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Try a different browser

## API stuff (if you care)

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/upload/server-upload
GET /api/download?docId=ID
```

## Debug mode

See what's happening:
```bash
DEBUG=prisma:* npm run dev
```

Check TypeScript errors:
```bash
npm run type-check
```

## License

Use it. Learn from it. Build on it. No restrictions.


## Questions?

This is a learning project. If something doesn't work or is confusing, feel free to check the code or ask for help.
