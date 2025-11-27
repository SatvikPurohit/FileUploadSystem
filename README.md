# File Upload System

A simple app where you can upload files, store them on your computer, and download them later. Built with Next.js, React, and Material-UI with a beautiful modern interface.

## What does it do?

- **Log in** with an email and password
- **Upload files** — pick one or more files and they get saved to your computer
- **See upload progress** — watch as files upload in real-time with progress bars and status
- **Download files** — once uploaded, download them back whenever you want
- **Manage uploads** — retry failed uploads or cancel ones you don't need
- **Beautiful UI** — clean, modern interface with smooth animations and gradients

That's it. Simple and straightforward.

## How to set it up

### Requirements
- Node.js (v16 or newer)
- npm or yarn

### Steps

1. **Clone or download** the project
   ```bash
   cd FileUploadSystem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```
   This creates a local SQLite database and adds a demo user (email: `demo@local.test`, password: `Password123!`)

4. **Start the app**
   ```bash
   npm run dev
   ```
   Open your browser and go to `http://localhost:3000`

5. **Log in** with the demo account:
   - Email: `demo@local.test`
   - Password: `Password123!`

## How it works

### Home Page
- Shows two main options: "Upload Files" and "Login"
- Each card is interactive with smooth hover animations
- Demo credentials are displayed at the bottom

### Uploading files
- Click the **"Upload Files"** button to go to the upload page
- Click **"+ Pick Files"** and select one or more files
- The app shows progress as files upload with a colored progress bar
- Once done, you can download the file or try again if it fails
- Click **"Stop All"** to cancel all pending uploads

### Downloading files
- On the upload page, find the file you uploaded (marked as "success")
- Click the **"Download"** button next to the file
- The file is downloaded to your computer

### Logging in
- Click the **"Login"** button on the home page
- Enter your email and password
- The app saves your login in the browser, so you stay logged in

### Local storage
- Files are saved in `public/uploads/` on your computer
- Each user has their own folder with a timestamp, like: `public/uploads/userId/1234567890_filename.pdf`
- Everything stays local — no cloud needed
- Files are never deleted automatically

## Project structure

```
FileUploadSystem/
├── app/                              # React components (Next.js App Router)
│   ├── components/UploadQueue.tsx    # File upload queue UI with MUI
│   ├── login/page.tsx                # Login page with form
│   ├── health/page.tsx               # System health check page
│   ├── page.tsx                      # Home/landing page
│   ├── globals.css                   # Global styles
│   └── layout.tsx                    # App wrapper
├── pages/
│   ├── api/
│   │   ├── upload/server-upload.ts   # File upload handler (saves to public/uploads)
│   │   ├── download.ts               # Download handler (serves files)
│   │   └── auth/
│   │       ├── login.ts              # Login endpoint
│   │       ├── logout.ts             # Logout endpoint
│   │       └── refresh.ts            # Token refresh endpoint
│   ├── _app.tsx                      # Global app wrapper with MUI ThemeProvider
│   └── upload.tsx                    # Upload page (alternative route)
├── prisma/
│   ├── schema.prisma                 # Database schema (User, Document models)
│   └── dev.db                        # SQLite database file
├── hooks/
│   └── useServerUploadQueue.tsx       # Upload queue state management
├── lib/
│   ├── auth.ts                       # JWT authentication helper
│   └── prisma.ts                     # Prisma client instance
├── scripts/
│   └── seed-user.ts                  # Script to add demo users
├── public/uploads/                   # Where uploaded files are stored
└── types/
    └── aws-sdk.d.ts                  # TypeScript type definitions
```

## Tech stack

- **Next.js 16** — web framework with React Server Components
- **React 19** — UI library
- **Material-UI (MUI) v5** — beautiful pre-built components
- **Emotion** — CSS-in-JS styling engine (powers MUI)
- **Prisma** — database ORM (uses SQLite)
- **Axios** — HTTP client for API requests
- **Formidable** — file parsing and multipart form handling
- **JWT** — secure authentication tokens

## Environment variables

You can add a `.env.local` file if you want to customize things:

```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-here"
```

By default, it uses a local SQLite database in the `prisma/` folder and a built-in secret key.

## Common tasks

### Add a new user to the database
Run the seed script:
```bash
npx prisma db seed
```

### View and edit the database
```bash
npx prisma studio
```
This opens a web UI where you can see and modify all data.

### Reset the database
```bash
rm prisma/dev.db
npx prisma migrate dev
```

### Build for production
```bash
npm run build
npm start
```

## Troubleshooting

**Files not uploading?**
- Make sure you're logged in first
- Check that the `public/uploads/` folder exists (it's created automatically)
- Check your browser console for errors (press F12)
- Make sure you have permission to write to the folder

**Can't log in?**
- Use the demo account: `demo@local.test` / `Password123!`
- Add your own user in Prisma Studio: `npx prisma studio`

**Port 3000 already in use?**
- The app will suggest another port automatically when you run `npm run dev`
- Or stop the other program using port 3000

**Database errors?**
- Try deleting the database and re-running migrations:
  ```bash
  rm prisma/dev.db
  npx prisma migrate dev
  ```

**UI not loading properly?**
- Clear your browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Try a different browser

## Development tips

### View all API endpoints
- `POST /api/auth/login` — login (body: { email, password })
- `POST /api/auth/logout` — logout
- `POST /api/auth/refresh` — refresh token
- `POST /api/upload/server-upload` — upload files (multipart form)
- `GET /api/download?docId=ID` — download a file

### Enable Prisma debug logs
```bash
DEBUG=prisma:* npm run dev
```

### Watch for TypeScript errors
```bash
npm run type-check
```

## License

Feel free to use this for learning or as a starting point for your own project.

## Questions?

This is a learning project. If something doesn't work or is confusing, feel free to check the code or ask for help.
