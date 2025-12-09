# File Upload System - Complete Interview Preparation Guide

## 📚 Table of Contents
1. [Project Overview](#project-overview)
2. [Learning Path: Basics to Pro](#learning-path-basics-to-pro)
3. [Architecture Deep Dive](#architecture-deep-dive)
4. [Technology Stack Explained](#technology-stack-explained)
5. [Key Concepts with Analogies](#key-concepts-with-analogies)
6. [Code Walkthrough](#code-walkthrough)
7. [Common Interview Questions](#common-interview-questions)
8. [What Interviewers Might Ask You to Change](#what-interviewers-might-ask-to-change)

---

## Project Overview

### What is this project?
A full-stack **File Upload System** that allows users to:
- Login with email/password authentication
- Upload multiple files (PDF, DOCX, TXT)
- Track upload progress in real-time
- Manage uploaded files
- Handle authentication with JWT tokens

### Quick Stats
- **Backend**: Node.js + Hapi.js + Prisma + SQLite
- **Frontend**: React + TypeScript + Material-UI
- **Authentication**: JWT (Access + Refresh tokens)
- **File Storage**: Local filesystem
- **Max File Size**: 10MB per file
- **Concurrent Uploads**: 3 files at a time

---

## Learning Path: Basics to Pro

### Level 1: Beginner (Week 1-2)
**Goal**: Understand what the application does and basic concepts

#### Topics to Master:
1. **HTTP Basics**
   - What is a request/response?
   - GET vs POST vs PUT vs DELETE
   - What are headers and cookies?

2. **REST API Concepts**
   - What is an API endpoint?
   - Status codes (200, 401, 404, 500)
   - Request body vs query params

3. **Authentication Basics**
   - What is a token?
   - Why do we need authentication?
   - Sessions vs Tokens

**Analogy**: Think of HTTP like sending letters
- **Request**: You write a letter (request) asking for information
- **Response**: Someone sends you a reply (response)
- **Headers**: The envelope with sender/receiver info
- **Body**: The actual content of the letter

#### Practice Questions:
- What happens when a user clicks "Login"?
- Why do we need both access and refresh tokens?
- What does the 401 status code mean?

---

### Level 2: Intermediate (Week 3-4)
**Goal**: Understand how components work together

#### Topics to Master:
1. **Frontend Architecture**
   - React components and state
   - React Router (navigation)
   - API calls with Axios
   - Form handling

2. **Backend Architecture**
   - Route handlers
   - Middleware
   - Database queries with Prisma
   - File handling

3. **File Upload Flow**
   - Multipart form data
   - Streaming vs buffering
   - Progress tracking
   - Validation

**Analogy**: The application is like a restaurant
- **Frontend (React)**: The dining area where customers interact
- **Backend (Hapi)**: The kitchen where food is prepared
- **Database (SQLite)**: The inventory/recipe book
- **API Routes**: Waiters who take orders and bring food

#### Practice Questions:
- How does the frontend know upload progress?
- What happens if the network disconnects during upload?
- How does the backend validate file types?

---

### Level 3: Advanced (Week 5-6)
**Goal**: Understand security, performance, and edge cases

#### Topics to Master:
1. **Security**
   - JWT token expiration and refresh flow
   - CORS (Cross-Origin Resource Sharing)
   - Input validation
   - File type validation
   - XSS and CSRF protection

2. **Performance**
   - Concurrent upload limiting
   - Stream processing for large files
   - Database indexing
   - Caching strategies

3. **Error Handling**
   - Try-catch blocks
   - User-friendly error messages
   - Logging and debugging
   - Rollback on failures

**Analogy**: Security is like airport security
- **Authentication**: Showing your passport (token)
- **Authorization**: Checking if you have boarding pass for this flight
- **Validation**: Ensuring your luggage (files) meets requirements
- **CORS**: International travel agreements between countries (servers)

#### Practice Questions:
- What happens if an access token expires during upload?
- How do you prevent malicious files from being uploaded?
- What if 100 users upload simultaneously?

---

### Level 4: Expert (Week 7-8)
**Goal**: Be able to discuss improvements and scalability

#### Topics to Master:
1. **Scalability**
   - Cloud storage (AWS S3, Azure Blob)
   - Load balancing
   - Database scaling
   - Microservices architecture

2. **Advanced Features**
   - Websockets for real-time updates
   - File compression
   - Virus scanning
   - File versioning

3. **DevOps**
   - Docker containerization
   - CI/CD pipelines
   - Monitoring and logging
   - Testing strategies

**Analogy**: Scaling is like expanding a restaurant
- **Current**: Small local restaurant (SQLite, local storage)
- **Scaled**: Chain restaurant with multiple locations
  - **S3**: Central warehouse for ingredients
  - **Load Balancer**: Host who directs customers to available tables
  - **Database Sharding**: Multiple inventory systems for different locations

---

## Architecture Deep Dive

### System Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Backend       │
│   (React)       │◄───────►│   (Hapi.js)     │
│   Port 5173     │  HTTP   │   Port 4000     │
└─────────────────┘         └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
              │  Database │   │   File    │   │    JWT    │
              │  (SQLite) │   │  Storage  │   │  Tokens   │
              │           │   │ /uploads/ │   │           │
              └───────────┘   └───────────┘   └───────────┘
```

### Request Flow Example: Upload a File

```
1. User selects file → Frontend validates (size, type)
2. Frontend creates FormData with file
3. Frontend sends POST /api/upload with Authorization header
4. Backend verifies JWT token
5. Backend streams file using Busboy
6. Backend validates mimetype while streaming
7. Backend saves to /uploads/<userId>/
8. Backend creates record in database
9. Backend returns success response
10. Frontend updates UI with success message
```

**Analogy**: Like ordering food delivery
1. You choose food (select file)
2. App checks if restaurant is open (frontend validation)
3. App sends order with your credentials (POST with JWT)
4. Restaurant verifies you're a real customer (JWT verification)
5. Restaurant prepares food (process file)
6. Restaurant checks ingredients are fresh (validate mimetype)
7. Driver delivers to your address (save to user folder)
8. Restaurant records the order (database entry)
9. You get confirmation (success response)
10. App shows order status (UI update)

---

## Technology Stack Explained

### Backend Technologies

#### 1. **Node.js**
- **What**: JavaScript runtime for server-side code
- **Why**: Fast, event-driven, handles concurrent requests well
- **Analogy**: Kitchen equipment that lets chefs (code) work efficiently

#### 2. **Hapi.js**
- **What**: Web framework for building APIs
- **Why**: Powerful configuration, good security features, built-in validation
- **Analogy**: The restaurant management system that organizes orders

#### 3. **Prisma**
- **What**: ORM (Object-Relational Mapping) for database
- **Why**: Type-safe database queries, migrations, easy to use
- **Analogy**: A translator between your code (English) and database (another language)

#### 4. **SQLite**
- **What**: Lightweight file-based database
- **Why**: Easy setup, no separate server needed, good for development
- **Analogy**: A filing cabinet (vs PostgreSQL which is like a warehouse)

#### 5. **JWT (jsonwebtoken)**
- **What**: Secure tokens for authentication
- **Why**: Stateless, scalable, works across services
- **Analogy**: A temporary VIP pass to a concert (includes encoded information)

#### 6. **Busboy**
- **What**: Stream-based multipart form data parser
- **Why**: Memory-efficient for large files, real-time processing
- **Analogy**: An assembly line that processes packages piece by piece

### Frontend Technologies

#### 1. **React**
- **What**: UI library for building interactive interfaces
- **Why**: Component-based, efficient updates, large ecosystem
- **Analogy**: LEGO blocks - reusable pieces that snap together

#### 2. **TypeScript**
- **What**: JavaScript with type checking
- **Why**: Catches errors early, better IDE support, self-documenting
- **Analogy**: Spell-check for your code

#### 3. **Material-UI (MUI)**
- **What**: React component library
- **Why**: Pre-built beautiful components, responsive design
- **Analogy**: Pre-fabricated furniture vs building from scratch

#### 4. **React Query**
- **What**: Data fetching and caching library
- **Why**: Automatic retries, caching, loading states
- **Analogy**: A smart assistant that remembers previous requests

#### 5. **React Router**
- **What**: Navigation/routing library
- **Why**: Client-side routing, protected routes
- **Analogy**: A GPS system for your application

#### 6. **Axios**
- **What**: HTTP client for API calls
- **Why**: Interceptors, automatic JSON parsing, better error handling
- **Analogy**: A professional courier service (vs fetch which is basic mail)

---

## Key Concepts with Analogies

### 1. JWT Authentication Flow

**Simple Explanation**:
When you login, the server gives you two tokens:
- **Access Token**: Short-lived (15 minutes) - like a parking ticket
- **Refresh Token**: Long-lived (7 days) - like a parking permit

**Why Two Tokens?**
- If access token is stolen, it expires quickly (limited damage)
- Refresh token is kept more secure (HttpOnly cookie)
- When access token expires, use refresh token to get a new one

**Analogy**: Hotel key cards
- **Access Token**: Room key card (expires each day)
- **Refresh Token**: Your ID at front desk (can get new key cards)
- If you lose your room key, it's only valid for today
- Your ID at front desk can get you new keys for your entire stay

### 2. Multipart Form Data & File Streaming

**Simple Explanation**:
When uploading files, the browser sends data in "parts":
- Part 1: File metadata (name, type)
- Part 2: Actual file content (in chunks)
- Part 3: Other form fields

**Why Streaming?**
- Don't load entire file into memory
- Process chunks as they arrive
- Can handle files larger than RAM

**Analogy**: Drinking through a straw
- **Buffering**: Pour entire drink into your mouth at once (risky!)
- **Streaming**: Drink little by little through a straw (safe!)

### 3. CORS (Cross-Origin Resource Sharing)

**Simple Explanation**:
Browsers block requests from one website to another for security.
CORS is the server saying "I trust requests from localhost:5173"

**Why Needed?**
- Frontend runs on localhost:5173
- Backend runs on localhost:4000
- Different ports = different origins
- Without CORS, browser blocks the request

**Analogy**: Building security
- **Your office (backend)** only allows visitors from approved companies
- **Visitor badge (CORS header)** shows you're from an approved company
- **Security guard (browser)** checks the badge before letting you in

### 4. Concurrent Upload Limiting

**Simple Explanation**:
Only process 3 uploads at once, queue the rest.

**Why Limit?**
- Prevent overwhelming server/network
- Better user experience (progress bars)
- Fair resource allocation

**Analogy**: Checkout lanes at a store
- **3 concurrent uploads**: 3 open checkout lanes
- **Queue**: People waiting in line
- **Worker**: Manager who opens next lane when one finishes

### 5. Database Relations (Prisma Schema)

```prisma
User (1) ─── (many) Documents
```

**Simple Explanation**:
- One User can have many Documents
- Each Document belongs to one User

**Analogy**: Library system
- **User**: Library member
- **Documents**: Books borrowed by that member
- Member card (userId) links books to member

### 6. Protected Routes

**Simple Explanation**:
Some pages require authentication to access.

**How it works**:
1. User tries to access /upload
2. ProtectedRoute checks for valid token
3. If no token → redirect to /login
4. If valid token → show /upload page

**Analogy**: VIP club entrance
- **Public pages (/login)**: Anyone can enter lobby
- **Protected pages (/upload)**: Need membership card (token)
- **Bouncer (ProtectedRoute)**: Checks your card before entry

---

## Code Walkthrough

### Backend Code Explained

#### 1. Server Setup (server.ts)

```typescript
// Create server with CORS enabled
const server = Hapi.server({
  port: PORT || 4000,
  routes: {
    cors: {
      origin: [FRONTEND_URL],
      credentials: true  // Allow cookies
    }
  }
});
```

**What's happening?**
- Creates HTTP server on port 4000
- Enables CORS for frontend origin
- Allows credentials (cookies) to be sent

**Analogy**: Setting up a shop
- Port 4000: Shop address
- CORS: List of customers allowed to enter
- Credentials: VIP customers can use their loyalty cards

#### 2. JWT Authentication Strategy

```typescript
server.auth.strategy("jwt", "jwt", {
  key: JWT_SECRET,
  validate: async (decoded) => {
    const userId = decoded?.id;
    const isValid = Boolean(userId);
    return { isValid, credentials: { id: userId } };
  },
  cookieKey: "token"
});
```

**What's happening?**
- Defines how to verify JWT tokens
- Looks for token in "token" cookie
- Extracts userId from decoded token
- Attaches userId to request credentials

**Analogy**: ID verification at club entrance
- JWT_SECRET: The special stamp verifier
- validate: Bouncer checking if ID is real
- cookieKey: Where the ID is stored (pocket = cookie)
- credentials: VIP wristband given after verification

#### 3. Login Route (routes/auth.ts)

```typescript
handler: async (request, h) => {
  const { email, password } = request.payload;
  
  // Find user in database
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  // Check password
  const match = await bcrypt.compare(password, user.password);
  
  // Issue tokens
  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = await signRefreshToken({ sub: user.id });
  
  // Set cookies
  h.state("token", accessToken, { isHttpOnly: true });
  h.state("refresh_token", refreshToken, { isHttpOnly: true });
  
  return h.response({ ok: true });
}
```

**What's happening?**
1. Extract email/password from request
2. Find user in database by email
3. Compare provided password with hashed password
4. Create access token (15 min) and refresh token (7 days)
5. Store tokens in HttpOnly cookies
6. Return success response

**Analogy**: ATM withdrawal
1. Insert card (email)
2. Enter PIN (password)
3. Bank verifies card + PIN (database check)
4. Bank confirms identity (bcrypt.compare)
5. ATM gives you temporary receipt (access token)
6. Card remains valid for future use (refresh token)
7. Transaction approved (success response)

#### 4. File Upload Route (routes/upload.ts)

```typescript
handler: async (request, h) => {
  // Create busboy parser
  const busboy = new Busboy({ headers: req.headers });
  
  // Handle each file
  busboy.on("file", (fieldname, fileStream, filename, encoding, mimetype) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(mimetype)) {
      fileStream.resume();  // Discard
      return;
    }
    
    // Stream to disk
    const savePath = path.join(UPLOADS_DIR, filename);
    const writeStream = fs.createWriteStream(savePath);
    fileStream.pipe(writeStream);
    
    // Track size
    fileStream.on("data", (chunk) => {
      fileBytes += chunk.length;
      if (fileBytes > MAX_BYTES) {
        writeStream.destroy();
        fileStream.destroy();
      }
    });
  });
  
  // Pipe request to busboy
  req.pipe(busboy);
}
```

**What's happening?**
1. Create busboy parser for multipart data
2. Listen for file events
3. For each file: validate type
4. If valid: stream to disk chunk by chunk
5. Track total bytes, stop if over limit
6. Clean up on errors

**Analogy**: Receiving packages at warehouse
1. Set up package scanner (busboy)
2. Wait for packages (file events)
3. Check each package label (validate type)
4. If approved: move to storage area (stream to disk)
5. Weigh packages piece by piece (track bytes)
6. Reject if too heavy (over limit)

### Frontend Code Explained

#### 1. Login Page (LoginPage.tsx)

```typescript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    await loginClient(email, password);
    auth.login();
    navigate("/upload");
  } catch (err) {
    setError(err.message);
  }
};
```

**What's happening?**
1. Prevent form default submission
2. Call login API with credentials
3. Update auth context on success
4. Navigate to upload page
5. Show error message on failure

**Analogy**: Logging into email
1. Click "Sign In" button
2. Send username/password to server
3. Server checks and responds
4. Update app to show "logged in"
5. Redirect to inbox (upload page)

#### 2. Upload Page - File Selection

```typescript
const handleFiles = (files: File[]) => {
  const items = files.map((file) => {
    const id = crypto.randomUUID();
    
    // Validate
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { id, status: "FAILED", error: "Invalid type" };
    }
    if (file.size > MAX_BYTES) {
      return { id, status: "FAILED", error: "Too large" };
    }
    
    return { id, status: "PENDING" };
  });
  
  setQueue([...queue, ...items]);
};
```

**What's happening?**
1. User drops files
2. Generate unique ID for each file
3. Check file type and size
4. Mark as FAILED if invalid
5. Mark as PENDING if valid
6. Add all to upload queue

**Analogy**: Airport baggage check-in
1. Bring bags to counter
2. Attach tag to each bag (unique ID)
3. Check bag type and weight
4. Reject if overweight or wrong type
5. Accept valid bags
6. All bags join conveyor belt (queue)

#### 3. Upload Page - Worker Pattern

```typescript
const startWorker = async () => {
  while (tasksRef.current.length) {
    // Limit concurrency
    if (activeCount >= CONCURRENCY) break;
    
    const id = tasksRef.current.shift();
    const item = queue.find(x => x.id === id);
    
    if (item.status !== "PENDING") continue;
    
    // Start upload
    activeCount++;
    uploadFile(item);
  }
};
```

**What's happening?**
1. Check if there are pending uploads
2. Stop if already at concurrency limit (3)
3. Take next item from queue
4. Skip if not in PENDING state
5. Increment active counter
6. Start the upload

**Analogy**: Restaurant kitchen
1. Check order tickets (pending uploads)
2. Only 3 chefs can work at once (concurrency)
3. Take next order (shift from queue)
4. Skip if order cancelled (not PENDING)
5. Chef starts cooking (upload)
6. Repeat when chef finishes

#### 4. Upload Progress Tracking

```typescript
const uploadSingle = async (item, signal) => {
  const formData = new FormData();
  formData.append("file", file);
  
  await axios.post("/upload", formData, {
    signal,  // For cancellation
    onUploadProgress: (progressEvent) => {
      const percent = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      
      updateQueue(prev =>
        prev.map(it =>
          it.id === item.id
            ? { ...it, progress: percent }
            : it
        )
      );
    }
  });
};
```

**What's happening?**
1. Create form data with file
2. Send POST request
3. Listen to upload progress events
4. Calculate percentage uploaded
5. Update item's progress in queue
6. Support cancellation via signal

**Analogy**: Package shipping tracker
1. Wrap item in box (FormData)
2. Ship via courier (axios.post)
3. Courier sends location updates (onUploadProgress)
4. Calculate how far delivered (percentage)
5. Update tracking app (updateQueue)
6. Can request delivery cancellation (signal)

---

## Common Interview Questions

### Basic Level

**Q1: What happens when a user logs in?**

**A**: 
1. User enters email and password
2. Frontend sends POST /api/auth/login
3. Backend finds user in database by email
4. Backend compares password with hashed version using bcrypt
5. If match: backend creates access token (15 min) and refresh token (7 days)
6. Backend stores tokens in HttpOnly cookies
7. Frontend updates auth state and redirects to /upload page

**Q2: Why do we use HttpOnly cookies for tokens?**

**A**: 
- **Security**: JavaScript cannot access HttpOnly cookies
- **Protection**: Prevents XSS attacks from stealing tokens
- **Automatic**: Browser automatically sends cookies with requests
- **Stateless**: Server doesn't need to store sessions

**Q3: What is the purpose of the refresh token?**

**A**: 
- Access tokens expire quickly (15 minutes)
- Refresh tokens last longer (7 days)
- When access token expires, use refresh token to get new access token
- User stays logged in without re-entering password
- If refresh token is compromised, limited time window for attack

### Intermediate Level

**Q4: How does file upload progress tracking work?**

**A**: 
1. Axios provides `onUploadProgress` callback
2. Browser sends file in chunks
3. After each chunk sent, browser fires progress event
4. Event contains `loaded` (bytes sent) and `total` (bytes total)
5. Calculate percentage: `(loaded / total) * 100`
6. Update React state to trigger UI re-render
7. Progress bar reflects current percentage

**Q5: Why limit concurrent uploads to 3?**

**A**: 
- **Browser limits**: Browsers limit concurrent connections (~6)
- **Server resources**: Prevent overwhelming server
- **User experience**: Better progress tracking
- **Network**: More stable uploads
- **Fair usage**: Prevent one user from monopolizing resources

**Q6: How does the application handle large files efficiently?**

**A**: 
- **Streaming**: Process file in chunks, not all at once
- **Busboy**: Parses multipart data without loading into memory
- **Pipe**: Direct stream from request to file system
- **Memory**: Only current chunk in memory (~64KB)
- **Scalability**: Can handle files larger than available RAM

### Advanced Level

**Q7: What security measures are implemented?**

**A**: 
1. **Authentication**: JWT tokens verify user identity
2. **Authorization**: Routes check user permissions
3. **CORS**: Restrict which origins can make requests
4. **HttpOnly Cookies**: Prevent XSS token theft
5. **File Validation**: Check mimetype and size
6. **Password Hashing**: Bcrypt with salt
7. **Input Validation**: Joi schema validation
8. **Path Traversal**: Use path.basename() for filenames
9. **Rate Limiting**: (not implemented, but should be)

**Q8: How would you handle token expiration during an upload?**

**A**: 
Current implementation:
- If token expires during upload, request fails with 401
- User must re-login and retry upload

Better implementation:
1. Axios interceptor catches 401 errors
2. Attempt to refresh token automatically
3. Retry failed request with new token
4. If refresh fails, logout and redirect to login
5. Show user-friendly message: "Session expired, retrying..."

**Q9: What are the limitations of current file storage approach?**

**A**: 
1. **Scalability**: Local storage doesn't scale horizontally
2. **Redundancy**: No backup if server fails
3. **Performance**: File I/O blocks server
4. **Cost**: Server storage is expensive
5. **CDN**: Cannot use CDN for faster downloads
6. **Clustering**: Multiple servers can't access same files

**Better approach**: Use cloud storage (S3, Azure Blob)

---

## What Interviewers Might Ask to Change

### 1. "Add cloud storage support (S3)"

**Why**: Local storage doesn't scale

**Implementation Steps**:
1. Install AWS SDK: `npm install @aws-sdk/client-s3`
2. Configure AWS credentials
3. Change upload route to use S3:
   ```typescript
   const s3 = new S3Client({ region: "us-east-1" });
   await s3.send(new PutObjectCommand({
     Bucket: "my-bucket",
     Key: `${userId}/${filename}`,
     Body: fileStream
   }));
   ```
4. Update database to store S3 URL instead of local path
5. Add signed URL generation for downloads

**Analogy**: Moving from home storage to warehouse
- Local: Like storing inventory in your garage
- S3: Like renting Amazon warehouse space
- Benefits: Unlimited space, professional security, global access

### 2. "Implement virus scanning"

**Why**: Malicious files could harm users

**Implementation Steps**:
1. Install ClamAV or use cloud service (VirusTotal API)
2. Add scanning step after upload:
   ```typescript
   const scanResult = await clamav.scanFile(filePath);
   if (scanResult.isInfected) {
     fs.unlinkSync(filePath);
     return h.response({ error: "Virus detected" }).code(400);
   }
   ```
3. Update document status: "scanning" → "clean" / "infected"
4. Quarantine infected files
5. Notify admin of threats

**Analogy**: Airport security screening
- Every bag (file) goes through X-ray (virus scan)
- Suspicious items flagged and removed
- Safe items proceed to destination

### 3. "Add file compression"

**Why**: Save storage space and bandwidth

**Implementation Steps**:
1. Install compression library: `npm install sharp` (images) or `pako` (general)
2. Compress before saving:
   ```typescript
   const compressed = await sharp(buffer)
     .resize(1920, 1080, { fit: "inside" })
     .jpeg({ quality: 80 })
     .toBuffer();
   ```
3. Store original size in database
4. Decompress on download if needed
5. Show compression ratio to user

**Analogy**: Vacuum-sealed storage bags
- Compress items to save space
- Can always expand back to original
- Especially useful for photos and documents

### 4. "Implement real-time notifications with WebSockets"

**Why**: Better user experience for long uploads

**Implementation Steps**:
1. Install Socket.io: `npm install socket.io`
2. Set up WebSocket server:
   ```typescript
   const io = new Server(server, { cors: { origin: FRONTEND_URL } });
   
   io.on("connection", (socket) => {
     socket.on("subscribe", (userId) => {
       socket.join(`user:${userId}`);
     });
   });
   ```
3. Emit events on upload progress:
   ```typescript
   io.to(`user:${userId}`).emit("upload:progress", { 
     fileId, 
     percent 
   });
   ```
4. Frontend listens for events:
   ```typescript
   socket.on("upload:progress", ({ fileId, percent }) => {
     updateProgress(fileId, percent);
   });
   ```

**Analogy**: Live sports commentary
- Regular API: Check score every few minutes (polling)
- WebSocket: Announcer tells you instantly when something happens
- Real-time, no delay, no wasted requests

### 5. "Add file versioning"

**Why**: Track document changes over time

**Implementation Steps**:
1. Update Prisma schema:
   ```prisma
   model Document {
     id       Int      @id @default(autoincrement())
     version  Int      @default(1)
     parentId Int?
     parent   Document? @relation("Versions", fields: [parentId])
     versions Document[] @relation("Versions")
   }
   ```
2. On upload, check if file already exists:
   ```typescript
   const existing = await prisma.document.findFirst({
     where: { userId, filename }
   });
   
   if (existing) {
     await prisma.document.create({
       data: {
         ...documentData,
         version: existing.version + 1,
         parentId: existing.id
       }
     });
   }
   ```
3. Add UI to view version history
4. Allow downloading specific versions

**Analogy**: Google Docs version history
- Every save creates a new version
- Can view history and restore old versions
- Never lose work

### 6. "Implement rate limiting"

**Why**: Prevent abuse and DoS attacks

**Implementation Steps**:
1. Install rate limiter: `npm install hapi-rate-limit`
2. Configure limits:
   ```typescript
   await server.register({
     plugin: HapiRateLimit,
     options: {
       userLimit: 100,           // 100 requests
       userCache: { expiresIn: 60000 }, // per minute
       pathLimit: 10,             // 10 uploads
       pathCache: { expiresIn: 60000 }  // per minute
     }
   });
   ```
3. Return 429 status when limit exceeded
4. Add retry-after header
5. Show friendly message to user

**Analogy**: Theme park ride limits
- Can only ride 10 times per hour
- Prevents one person from monopolizing ride
- Everyone gets fair chance

### 7. "Add database migration to PostgreSQL"

**Why**: SQLite doesn't scale for production

**Implementation Steps**:
1. Install PostgreSQL driver:
   ```bash
   npm install pg
   ```
2. Update Prisma schema:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Add connection string to .env:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
   ```
4. Run migration:
   ```bash
   npx prisma migrate dev
   ```
5. Update queries (most work automatically)
6. Add connection pooling for performance

**Analogy**: Upgrading from file cabinet to database warehouse
- SQLite: Filing cabinet in office (good for small teams)
- PostgreSQL: Warehouse with inventory system (enterprise-ready)
- Benefits: Concurrent access, better performance, replication

### 8. "Add file download with signed URLs"

**Why**: Secure, time-limited access

**Implementation Steps**:
1. Add download route:
   ```typescript
   {
     method: "GET",
     path: "/api/download/{documentId}",
     options: { auth: "jwt" },
     handler: async (request, h) => {
       const { documentId } = request.params;
       const userId = request.auth.credentials.id;
       
       const doc = await prisma.document.findFirst({
         where: { id: documentId, userId }
       });
       
       if (!doc) {
         return h.response({ error: "Not found" }).code(404);
       }
       
       // Generate signed URL (expires in 1 hour)
       const token = JWT.sign(
         { documentId, userId },
         JWT_SECRET,
         { expiresIn: "1h" }
       );
       
       return h.response({ 
         url: `/api/download/file?token=${token}` 
       });
     }
   }
   ```
2. Add file serving route:
   ```typescript
   {
     method: "GET",
     path: "/api/download/file",
     handler: async (request, h) => {
       const { token } = request.query;
       const decoded = JWT.verify(token, JWT_SECRET);
       
       const doc = await prisma.document.findUnique({
         where: { id: decoded.documentId }
       });
       
       return h.file(doc.path);
     }
   }
   ```

**Analogy**: Movie ticket with showtime
- Can't use ticket before/after showtime
- Ticket expires after use
- Must show valid ticket to enter

### 9. "Add file type detection using magic numbers"

**Why**: Mimetype can be spoofed, magic numbers are reliable

**Implementation Steps**:
1. Install file-type: `npm install file-type`
2. Read first bytes of file:
   ```typescript
   import { fileTypeFromBuffer } from "file-type";
   
   fileStream.once("data", async (chunk) => {
     const type = await fileTypeFromBuffer(chunk);
     
     if (!type || !ALLOWED_TYPES.includes(type.mime)) {
       fileStream.destroy();
       return h.response({ error: "Invalid file type" }).code(400);
     }
     
     // Continue processing...
   });
   ```
3. Compare with declared mimetype
4. Reject if mismatch

**Analogy**: Airport security checking actual contents
- Don't just trust label on bag (mimetype)
- X-ray to see actual contents (magic numbers)
- A gun labeled "toy" is still a gun

### 10. "Implement retry logic with exponential backoff"

**Why**: Network errors are common, auto-retry improves UX

**Implementation Steps**:
1. Add retry utility:
   ```typescript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (err) {
         if (i === maxRetries - 1) throw err;
         
         const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
   }
   ```
2. Wrap upload call:
   ```typescript
   await retryWithBackoff(() => 
     axios.post("/upload", formData)
   );
   ```
3. Add UI indicators:
   - "Retrying... (attempt 2/3)"
   - Show retry countdown

**Analogy**: Calling a busy phone number
- First try: Busy signal
- Wait a bit, try again
- Wait longer, try again
- Eventually give up or connect

---

## Summary: From Basics to Interview Ready

### Week 1-2: Foundations
- Understand HTTP, REST, authentication
- Can explain what each technology does
- Walk through user login flow

### Week 3-4: Architecture
- Explain how components interact
- Understand file upload flow
- Debug common issues

### Week 5-6: Advanced Concepts
- Discuss security measures
- Explain performance optimizations
- Handle edge cases

### Week 7-8: Production Ready
- Propose scalability improvements
- Discuss cloud migration
- Answer "how would you change X?"

### Interview Day Checklist
✅ Can explain project in 2 minutes
✅ Understand each technology choice
✅ Know security measures implemented
✅ Can discuss 3-5 improvements
✅ Prepared with code examples
✅ Ready with analogies for complex topics
✅ Know common questions and answers
✅ Can draw architecture diagram

**Final Tip**: Interviewers love when you:
1. **Ask clarifying questions** ("What's the expected user load?")
2. **Discuss trade-offs** ("SQLite is simple but PostgreSQL scales better")
3. **Show learning attitude** ("I haven't used S3 but I understand the concept")
4. **Think about users** ("This would improve the user experience because...")
5. **Consider security** ("We should validate on both client and server")

Good luck with your interview! 🚀
