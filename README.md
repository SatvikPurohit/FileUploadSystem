# 📤 File Upload System

Okay so like... you know how you need to store files? Yeah, this does that. No cloud nonsense, no AWS bills, just your computer. Built with Next.js, React, and Material-UI. It's messy but it works, lol.

Quick Start

## what it does

drag n drop your files, they stick around on your computer, grab em back whenever. that's literally it.

- **login** — type in your email, boom
- **upload files** — pick stuff, watch bars move
- **download** — click and it's yours
- **controls** — retry, stop, whatever
- **zero cloud** — everything stays put

dead simple.

## actually getting it running

### what you need
- Node.js (16+)
- npm or yarn or whatever

### let's go

1. **grab the code**
   ```bash
   cd FileUploadSystem
   ```

2. **install stuff**
   ```bash
   npm install
   ```

3. **database time**
   ```bash
   npx prisma migrate dev
   ```
   makes a db and adds a demo user. cool.

4. **fire it up**
   ```bash
   npm run dev
   ```
   then hit `http://localhost:3000`

5. **login**
   - email: `demo@local.test`
   - password: `Password123!`

you're in. now what?

## using this thing

### home
click a button. that's it.

### upload
pick files, watch them go up, download em or try again. "Stop All" nukes everything.

### downloads
your files are sitting there. click download. done.

### staying logged in
stays in your browser. close it? you're still logged in next time. it's magic. (not really, it's localStorage)

### where do files live?
`public/uploads/` on your hard drive. each user gets their own folder. no cloud, no servers far away, just... there. on your computer. forever probably.

## the tech stack

- **Next.js 16** — web framework. it's good
- **React 19** — makes pretty things
- **Material-UI** — buttons and forms and stuff
- **Prisma** — talks to the database so we don't have to
- **SQLite** — database that just works
- **Axios** — http requests
- **Formidable** — parses file uploads
- **JWT** — keeps you logged in

## tweak it

make `.env.local`:

```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="whatever"
```

don't even need it tho. just works out of the box.

## commands that matter

### add users
```bash
npx prisma db seed
```

### see your data
```bash
npx prisma studio
```
opens a ui. you can see stuff. click stuff. change stuff. it's fun.

### nuke it from orbit
```bash
rm prisma/dev.db
npx prisma migrate dev
```
starts fresh. everything gone. new database. just like that.

### make it production ready
```bash
npm run build
npm start
```

## when stuff breaks

**files won't upload?**
- you logged in?
- `public/uploads/` folder there?
- check console (f12) for errors
- can you write to that folder?

**can't login?**
- `demo@local.test` / `Password123!`
- or make your own user in prisma studio

**port 3000 taken?**
- it'll find another one automatically
- or just kill whatever's on 3000

**database is broken?**
- delete `prisma/dev.db`
- run `npx prisma migrate dev`
- boom. fixed.

**ui looks weird?**
- clear your cache (ctrl+shift+delete)
- hard refresh (ctrl+shift+r)
- try safari i guess

## api (if you're into that)

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/upload/server-upload
GET /api/download?docId=ID
```

## debug

see what's happening:
```bash
DEBUG=prisma:* npm run dev
```

find typescript errors:
```bash
npm run type-check
```

## license

do whatever. learn from it. steal the code. i don't care.

## questions?

it's a learning project. if it breaks or doesn't make sense, look at the code or just... figure it out. that's the fun part.
