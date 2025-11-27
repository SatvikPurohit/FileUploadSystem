# Quick Start Guide - Step by Step

Get the app running in 5 minutes. Follow these steps exactly.

## Step 1: Get the code

```bash
cd FileUploadSystem
```

That's it. You're in the right folder.

## Step 2: Install everything

```bash
npm install
```

This downloads all the code libraries the app needs. Takes a minute or two.

**What you should see:**
```
added XXX packages in XXs
```

## Step 3: Make the database

```bash
npx prisma migrate dev
```

This creates a database file and sets up a demo user.

**What you should see:**
```
✓ Generated Prisma Client
✓ Ran all pending migrations
```

A `prisma/dev.db` file appears. That's your database.

## Step 4: Start the app

```bash
npm run dev
```

**What you should see:**
```
✓ Ready in 302ms

  ▲ Next.js 16.0.5 (Turbopack)
  - Local:         http://localhost:3000
```

If you see this, it worked!

## Step 5: Open it in your browser

Click here → **http://localhost:3000**

Or copy-paste that link in your browser address bar.

You should see:
- A nice purple background
- "File Upload System" title
- Two buttons: "Upload Files" and "Login"

## Step 6: Log in

Click the **"Login"** button.

Enter these credentials:
```
Email: demo@local.test
Password: Password123!
```

Click **"Sign In"**.

Done! You're logged in.

## Step 7: Upload a file

1. Click **"Upload Files"** button
2. Click **"+ Pick Files"** 
3. Choose any file from your computer
4. Watch it upload with a progress bar
5. When done, click **"Download"** to get it back

🎉 That's it! Your file is now saved locally on your computer.

## What happens now?

- Files are saved in `public/uploads/` folder
- Your browser keeps you logged in
- Upload as many files as you want
- Download them anytime

## Want to add more users?

```bash
npx prisma studio
```

A web interface opens. You can add new users with their own login.

## Something went wrong?

### "Port 3000 is already in use"
```bash
npm run dev -- -p 3001
```
This starts it on port 3001 instead.

### "Module not found" or other errors
```bash
rm -rf node_modules
npm install
```
Then try again.

### "Can't connect to database"
```bash
rm prisma/dev.db
npx prisma migrate dev
npm run dev
```
This resets everything and starts fresh.

### Page is blank or broken
Press **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac) to hard refresh and clear cache.

## That's it!

You're ready to use the app. Happy uploading! 🚀

---

Need more info? Check out `README.md` for detailed documentation.
