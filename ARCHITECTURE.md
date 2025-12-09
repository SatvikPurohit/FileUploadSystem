# File Upload System - Technical Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [File Upload Pipeline](#file-upload-pipeline)
8. [Security Measures](#security-measures)
9. [Performance Optimizations](#performance-optimizations)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React App   │  │  Material-UI │  │ React Router │      │
│  │  (TypeScript)│  │  Components  │  │  (Routing)   │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
│         │                                                     │
│         │ HTTP Requests (Axios)                              │
│         │ with JWT Cookies                                   │
└─────────┼─────────────────────────────────────────────────────┘
          │
          │ CORS-enabled
          │
┌─────────▼─────────────────────────────────────────────────────┐
│                      Backend Server                            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Hapi.js Server (Node.js)                 │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │   Auth   │  │  Upload  │  │  Static  │           │    │
│  │  │  Routes  │  │  Routes  │  │  Routes  │           │    │
│  │  └────┬─────┘  └────┬─────┘  └──────────┘           │    │
│  │       │             │                                 │    │
│  │       │             │                                 │    │
│  └───────┼─────────────┼─────────────────────────────────┘    │
│          │             │                                       │
│  ┌───────▼─────┐  ┌────▼──────────┐                          │
│  │  JWT Auth   │  │  Busboy File  │                          │
│  │  Middleware │  │  Parser       │                          │
│  └─────────────┘  └───────────────┘                          │
│          │                │                                    │
│  ┌───────▼────────┐  ┌────▼──────────────┐                  │
│  │   Prisma ORM   │  │  File System API  │                  │
│  └───────┬────────┘  └────┬──────────────┘                  │
└──────────┼──────────────────┼──────────────────────────────────┘
           │                  │
┌──────────▼─────────┐  ┌────▼──────────────┐
│  SQLite Database   │  │  Upload Directory │
│  (dev.db)          │  │  /public/uploads/ │
│                    │  │  ├── userId1/     │
│  ├── User          │  │  │   ├── file1    │
│  └── Document      │  │  │   └── file2    │
└────────────────────┘  │  └── userId2/     │
                        │      └── file3    │
                        └───────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.x | UI framework |
| | TypeScript | 5.x | Type safety |
| | Material-UI | 5.x | Component library |
| | React Router | 6.x | Client-side routing |
| | React Query | 5.x | Server state management |
| | Axios | 1.x | HTTP client |
| | React Dropzone | 14.x | File drag-and-drop |
| **Backend** | Node.js | 20.x | Runtime |
| | Hapi.js | 20.x | Web framework |
| | TypeScript | 5.x | Type safety |
| | Prisma | 5.x | ORM |
| | SQLite | 3.x | Database |
| | JWT | 9.x | Token authentication |
| | Bcrypt | 2.x | Password hashing |
| | Busboy | 1.x | Multipart parser |
| **DevOps** | Concurrently | 8.x | Run multiple processes |
| | ts-node-dev | 2.x | TypeScript dev server |
| | Vite | 5.x | Frontend build tool |

---

## Component Architecture

### Frontend Components

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Main app component with routes
├── AuthContext.tsx             # Authentication state management
│
├── api/
│   ├── axios.ts                # Axios instance with interceptors
│   ├── axiosSetup.ts           # Axios configuration
│   ├── auth.ts                 # Auth API calls
│   └── authClient.ts           # Auth client utilities
│
├── components/
│   ├── AppLayout.tsx           # Main layout wrapper
│   ├── Navbar.tsx              # Navigation bar
│   ├── ProtectedRoute.tsx      # Route guard component
│   └── LogoutButton.tsx        # Logout button
│
├── modules/
│   ├── auth/
│   │   └── LoginPage.tsx       # Login page
│   └── uploads/
│       └── UploadPage.tsx      # File upload page
│
├── hooks/
│   └── useAuth.ts              # Custom auth hook
│
├── types/
│   └── index.ts                # TypeScript type definitions
│
└── mocks/
    ├── browser.ts              # MSW browser setup
    └── handlers.ts             # MSW request handlers
```

### Backend Components

```
backend/
├── server.ts                   # Server entry point
├── routesConfig.ts             # Routes configuration
├── config.ts                   # Environment config
│
├── routes/
│   ├── auth.ts                 # Authentication routes
│   └── upload.ts               # File upload routes
│
├── utils/
│   └── auth.ts                 # Auth utilities (JWT, bcrypt)
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── prisma.client.ts        # Prisma client instance
│   └── migrations/             # Database migrations
│
├── types/
│   └── index.ts                # TypeScript type definitions
│
└── seed.ts                     # Database seeding script
```

---

## Data Flow

### 1. Authentication Flow

```
┌──────────┐                                      ┌──────────┐
│ Frontend │                                      │ Backend  │
└────┬─────┘                                      └────┬─────┘
     │                                                 │
     │  POST /api/auth/login                          │
     │  { email, password }                           │
     ├────────────────────────────────────────────────►
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Find user by email │
     │                                     └───────────┬────────┘
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Compare password   │
     │                                     │ (bcrypt)           │
     │                                     └───────────┬────────┘
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Generate JWT       │
     │                                     │ - Access (15m)     │
     │                                     │ - Refresh (7d)     │
     │                                     └───────────┬────────┘
     │                                                 │
     │  200 OK                                         │
     │  Set-Cookie: token=xxx                          │
     │  Set-Cookie: refresh_token=xxx                  │
     ◄────────────────────────────────────────────────┤
     │                                                 │
┌────▼─────┐                                          │
│ Store    │                                          │
│ auth     │                                          │
│ state    │                                          │
└──────────┘                                          │
```

### 2. Token Refresh Flow

```
┌──────────┐                                      ┌──────────┐
│ Frontend │                                      │ Backend  │
└────┬─────┘                                      └────┬─────┘
     │                                                 │
     │  POST /api/upload (access token expired)       │
     ├────────────────────────────────────────────────►
     │                                                 │
     │  401 Unauthorized                               │
     ◄────────────────────────────────────────────────┤
     │                                                 │
┌────▼─────┐                                          │
│ Axios    │                                          │
│ Intercept│                                          │
│ 401      │                                          │
└────┬─────┘                                          │
     │                                                 │
     │  POST /api/auth/refresh                        │
     │  Cookie: refresh_token                         │
     ├────────────────────────────────────────────────►
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Verify refresh     │
     │                                     │ token              │
     │                                     └───────────┬────────┘
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Generate new       │
     │                                     │ access token       │
     │                                     └───────────┬────────┘
     │                                                 │
     │  200 OK                                         │
     │  Set-Cookie: token=new_token                    │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     │  Retry POST /api/upload (with new token)       │
     ├────────────────────────────────────────────────►
     │                                                 │
     │  200 OK                                         │
     ◄────────────────────────────────────────────────┤
```

### 3. File Upload Flow

```
┌──────────┐                                      ┌──────────┐
│ Frontend │                                      │ Backend  │
└────┬─────┘                                      └────┬─────┘
     │                                                 │
┌────▼─────────┐                                      │
│ User selects │                                      │
│ files        │                                      │
└────┬─────────┘                                      │
     │                                                 │
┌────▼─────────┐                                      │
│ Validate:    │                                      │
│ - Type (PDF, │                                      │
│   DOCX, TXT) │                                      │
│ - Size (<10MB│                                      │
└────┬─────────┘                                      │
     │                                                 │
┌────▼─────────┐                                      │
│ Add to queue │                                      │
│ Status:      │                                      │
│ PENDING      │                                      │
└────┬─────────┘                                      │
     │                                                 │
┌────▼─────────┐                                      │
│ Worker picks │                                      │
│ up to 3      │                                      │
│ files        │                                      │
└────┬─────────┘                                      │
     │                                                 │
     │  For each file:                                │
     │  POST /api/upload                              │
     │  Content-Type: multipart/form-data             │
     │  Cookie: token=xxx                             │
     ├────────────────────────────────────────────────►
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Verify JWT token   │
     │                                     └───────────┬────────┘
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Parse multipart    │
     │                                     │ with Busboy        │
     │                                     └───────────┬────────┘
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Validate mimetype  │
     │                                     │ Check size         │
     │                                     └───────────┬────────┘
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Stream to disk:    │
     │                                     │ /uploads/<userId>/ │
     │                                     └───────────┬────────┘
     │                                                 │
     │                                     ┌───────────▼────────┐
     │                                     │ Create DB record   │
     │                                     │ in Document table  │
     │                                     └───────────┬────────┘
     │                                                 │
     │  Progress events (every chunk)                 │
     ◄─────────────────────────────────────────────────
     │                                                 │
┌────▼─────────┐                                      │
│ Update       │                                      │
│ progress bar │                                      │
└────┬─────────┘                                      │
     │                                                 │
     │  200 OK                                         │
     │  { ok: true, files: [...] }                    │
     ◄────────────────────────────────────────────────┤
     │                                                 │
┌────▼─────────┐                                      │
│ Update       │                                      │
│ Status:      │                                      │
│ SUCCESS      │                                      │
└──────────────┘                                      │
```

---

## Database Schema

### Prisma Schema Definition

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id               Int        @id @default(autoincrement())
  email            String     @unique
  password         String     // Bcrypt hashed
  refreshTokenHash String?    // Hashed refresh token
  createdAt        DateTime   @default(now())
  documents        Document[]
  
  @@index([email])
}

model Document {
  id          Int       @id @default(autoincrement())
  userId      Int
  filename    String
  path        String    // File system path
  contentType String    // MIME type
  size        Int       // Bytes
  status      String    @default("success")
  createdAt   DateTime  @default(now())
  uploadedAt  DateTime?
  user        User      @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([createdAt])
}
```

### Entity Relationship Diagram

```
┌─────────────────────────┐
│         User            │
├─────────────────────────┤
│ id (PK)                 │
│ email (UNIQUE)          │
│ password                │
│ refreshTokenHash        │
│ createdAt               │
└──────────┬──────────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────┐
│      Document           │
├─────────────────────────┤
│ id (PK)                 │
│ userId (FK)             │
│ filename                │
│ path                    │
│ contentType             │
│ size                    │
│ status                  │
│ createdAt               │
│ uploadedAt              │
└─────────────────────────┘
```

### Database Queries

**Common Queries:**

```typescript
// 1. Find user by email
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" }
});

// 2. Create user with hashed password
const newUser = await prisma.user.create({
  data: {
    email: "user@example.com",
    password: hashedPassword
  }
});

// 3. Get user's documents
const documents = await prisma.document.findMany({
  where: { userId: 1 },
  orderBy: { createdAt: "desc" }
});

// 4. Create document record
const document = await prisma.document.create({
  data: {
    userId: 1,
    filename: "report.pdf",
    path: "/uploads/1/1234567890-report.pdf",
    contentType: "application/pdf",
    size: 1024000,
    status: "success"
  }
});

// 5. Update refresh token
await prisma.user.update({
  where: { id: 1 },
  data: { refreshTokenHash: hashedToken }
});
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
**Purpose**: Authenticate user and issue tokens

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "ok": true,
  "accessToken": "eyJhbGc..."
}
```

**Cookies Set:**
- `token`: Access token (15 min, HttpOnly)
- `refresh_token`: Refresh token (7 days, HttpOnly)
- `csrf_token`: CSRF token (session)

**Status Codes:**
- `200`: Success
- `400`: Invalid input
- `401`: Invalid credentials
- `500`: Server error

---

#### POST /api/auth/refresh
**Purpose**: Get new access token using refresh token

**Request:**
```json
{
  "refresh": "eyJhbGc..."
}
```

**Response:**
```json
{
  "ok": true,
  "accessToken": "eyJhbGc..."
}
```

**Status Codes:**
- `200`: Success
- `401`: Invalid/expired refresh token

---

#### POST /api/auth/verify-status
**Purpose**: Check if current token is valid

**Response:**
```json
{
  "ok": true,
  "userId": 1
}
```

**Status Codes:**
- `200`: Valid token
- `401`: Invalid/missing token

---

#### POST /api/auth/logout
**Purpose**: Logout user and revoke tokens

**Response:**
```json
{
  "ok": true
}
```

**Side Effects:**
- Clears all auth cookies
- Revokes refresh token in database

---

### File Upload Endpoints

#### POST /api/upload
**Purpose**: Upload one or more files

**Authentication**: Required (JWT)

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form field `file` (one or multiple)

**Response:**
```json
{
  "ok": true,
  "files": [
    {
      "fieldname": "file",
      "filename": "document.pdf",
      "savedTo": "/uploads/1/1234567890-document.pdf",
      "mimetype": "application/pdf",
      "size": 1024000
    }
  ],
  "fields": {}
}
```

**Validation:**
- Max file size: 10 MB
- Allowed types: PDF, DOCX, TXT
- Requires valid JWT token

**Status Codes:**
- `200`: Success
- `400`: Validation error
- `401`: Unauthorized
- `415`: Unsupported media type
- `499`: Upload aborted
- `500`: Server error

---

## Authentication & Authorization

### JWT Token Structure

**Access Token:**
```json
{
  "sub": 1,              // User ID
  "iat": 1234567890,     // Issued at
  "exp": 1234568790      // Expires (15 min)
}
```

**Refresh Token:**
```json
{
  "sub": 1,              // User ID
  "iat": 1234567890,     // Issued at
  "exp": 1235172690      // Expires (7 days)
}
```

### Token Flow

1. **Login**: Issue both tokens
2. **API Calls**: Use access token
3. **Token Expires**: Use refresh token to get new access token
4. **Refresh Expires**: User must login again

### Security Features

| Feature | Implementation |
|---------|----------------|
| **HttpOnly Cookies** | Tokens stored in HttpOnly cookies (XSS protection) |
| **Short-lived Access** | Access tokens expire in 15 minutes |
| **Long-lived Refresh** | Refresh tokens expire in 7 days |
| **Token Rotation** | Refresh token hashed and stored in DB |
| **Password Hashing** | Bcrypt with automatic salt |
| **CORS** | Restricted to frontend origin |
| **SameSite** | Cookies use SameSite policy |

---

## File Upload Pipeline

### Multipart Parsing with Busboy

**Why Busboy?**
- Stream-based (memory efficient)
- Handles large files
- Real-time processing
- No temp files

**How It Works:**

```typescript
// 1. Create Busboy instance
const busboy = new Busboy({ headers: req.headers });

// 2. Listen for file events
busboy.on("file", (fieldname, fileStream, filename, encoding, mimetype) => {
  // 3. Validate
  if (!ALLOWED_TYPES.includes(mimetype)) {
    fileStream.resume(); // Discard
    return;
  }
  
  // 4. Create write stream
  const writeStream = fs.createWriteStream(savePath);
  
  // 5. Track size
  let bytes = 0;
  fileStream.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) {
      writeStream.destroy();
      fileStream.destroy();
    }
  });
  
  // 6. Pipe to disk
  fileStream.pipe(writeStream);
});

// 7. Pipe request to Busboy
req.pipe(busboy);
```

### Upload Process Stages

```
┌──────────────────┐
│ 1. Receive       │  Browser sends multipart data
└────────┬─────────┘
         │
┌────────▼─────────┐
│ 2. Parse         │  Busboy extracts file stream
└────────┬─────────┘
         │
┌────────▼─────────┐
│ 3. Validate      │  Check mimetype and size
└────────┬─────────┘
         │
┌────────▼─────────┐
│ 4. Stream        │  Write chunks to disk
└────────┬─────────┘
         │
┌────────▼─────────┐
│ 5. Finalize      │  Close streams, create DB record
└────────┬─────────┘
         │
┌────────▼─────────┐
│ 6. Respond       │  Send success/error response
└──────────────────┘
```

### File Organization

```
public/
└── uploads/
    ├── 1/                      # User ID 1
    │   ├── 1701234567890-file1.pdf
    │   └── 1701234567891-file2.docx
    └── 2/                      # User ID 2
        └── 1701234567892-file3.txt
```

**Naming Convention:**
`{timestamp}-{originalFilename}`

**Benefits:**
- Unique filenames (no collisions)
- Chronological ordering
- Preserves original name
- Easy cleanup

---

## Security Measures

### 1. Input Validation

**Backend Validation (Joi):**
```typescript
validate: {
  payload: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  })
}
```

**Frontend Validation:**
```typescript
if (!ALLOWED_TYPES.includes(file.type)) {
  return { status: "FAILED", error: "Invalid type" };
}
if (file.size > MAX_BYTES) {
  return { status: "FAILED", error: "Too large" };
}
```

### 2. File Type Validation

**Mimetype Check:**
```typescript
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

if (!ALLOWED.includes(mimetype)) {
  throw new Error("Unsupported file type");
}
```

**Path Traversal Prevention:**
```typescript
const safeName = path.basename(filename); // Removes ../
```

### 3. Password Security

**Hashing:**
```typescript
import bcrypt from "bcryptjs";

// Hash
const hashedPassword = await bcrypt.hash(password, 10);

// Verify
const match = await bcrypt.compare(password, user.password);
```

**Requirements:**
- Minimum 8 characters
- Stored as bcrypt hash
- Salt automatically generated

### 4. CORS Configuration

```typescript
cors: {
  origin: [FRONTEND_URL],      // Whitelist frontend
  credentials: true,            // Allow cookies
  additionalHeaders: [          // Custom headers
    "authorization",
    "x-csrf-token"
  ]
}
```

### 5. Error Handling

**Don't Leak Information:**
```typescript
// ❌ Bad - reveals user exists
return "Password incorrect for user@example.com";

// ✅ Good - generic message
return "Invalid credentials";
```

**Log Errors, Return Generic:**
```typescript
try {
  // ... operation
} catch (err) {
  console.error("Detailed error:", err);
  return h.response({ error: "Operation failed" }).code(500);
}
```

---

## Performance Optimizations

### 1. Streaming vs Buffering

**Buffering (bad for large files):**
```typescript
// Load entire file into memory
const buffer = await readFile(path);
// Memory usage = file size
```

**Streaming (efficient):**
```typescript
// Process chunks
fileStream.pipe(writeStream);
// Memory usage = chunk size (~64KB)
```

### 2. Concurrent Upload Limiting

**Frontend Queue System:**
```typescript
const CONCURRENCY = 3;
let activeCount = 0;

const startWorker = () => {
  while (tasks.length && activeCount < CONCURRENCY) {
    activeCount++;
    uploadFile(tasks.shift());
  }
};
```

**Benefits:**
- Prevents overwhelming server
- Better progress tracking
- Fair resource allocation
- Improved user experience

### 3. Database Indexing

```prisma
model User {
  email String @unique
  
  @@index([email])  // Fast email lookups
}

model Document {
  userId Int
  
  @@index([userId])     // Fast user's documents query
  @@index([createdAt])  // Fast date sorting
}
```

### 4. Connection Pooling

**Prisma automatically handles:**
- Connection pooling
- Query optimization
- Prepared statements

### 5. Client-Side Caching

**React Query:**
```typescript
const { data } = useQuery({
  queryKey: ["documents"],
  queryFn: fetchDocuments,
  staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
  cacheTime: 10 * 60 * 1000   // Keep in cache for 10 minutes
});
```

---

## Deployment Architecture

### Development Environment

```
┌──────────────────────────────────────┐
│         Developer Machine             │
│                                       │
│  ┌─────────┐         ┌─────────┐    │
│  │ Vite    │         │ ts-node │    │
│  │ Dev     │         │ Dev     │    │
│  │ Server  │         │ Server  │    │
│  │ :5173   │         │ :4000   │    │
│  └─────────┘         └─────────┘    │
│       │                    │          │
│       └──────┬─────────────┘          │
│              │                         │
│       ┌──────▼──────┐                 │
│       │  SQLite DB  │                 │
│       └─────────────┘                 │
└──────────────────────────────────────┘
```

### Production Architecture (Proposed)

```
┌────────────────────────────────────────────────────┐
│                   Internet                          │
└─────────────────────┬──────────────────────────────┘
                      │
         ┌────────────▼────────────┐
         │    Load Balancer        │
         │    (NGINX/ALB)          │
         └─────┬──────────────┬────┘
               │              │
     ┌─────────▼────┐   ┌────▼─────────┐
     │   Frontend   │   │   Backend    │
     │   (Static)   │   │   (Nodes)    │
     │   CloudFront │   │   EC2/ECS    │
     │   + S3       │   └────┬─────────┘
     └──────────────┘        │
                      ┌──────┴──────┐
                      │             │
              ┌───────▼──────┐  ┌──▼─────────┐
              │  PostgreSQL  │  │  S3 Bucket │
              │  (RDS)       │  │  (Files)   │
              └──────────────┘  └────────────┘
```

### Environment Variables

**Backend (.env):**
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
FRONTEND_URL=https://app.example.com
UPLOADS_DIR=/var/app/uploads
AWS_REGION=us-east-1
AWS_BUCKET=my-uploads-bucket
```

**Frontend (.env.local):**
```bash
VITE_API_URL=https://api.example.com
VITE_ENV=production
```

### Scaling Considerations

| Component | Current | Scaled |
|-----------|---------|--------|
| **Database** | SQLite | PostgreSQL with replicas |
| **File Storage** | Local disk | S3 / Azure Blob |
| **Backend** | Single instance | Multiple instances + load balancer |
| **Frontend** | Vite dev | CDN (CloudFront/Cloudflare) |
| **Session** | JWT (stateless) | JWT + Redis (if needed) |
| **Cache** | None | Redis/Memcached |
| **Queue** | In-memory | Redis/SQS |

---

## Monitoring & Logging

### Logging Strategy

**Backend:**
```typescript
// Request logging
server.ext("onRequest", (request, h) => {
  console.log(`${request.method} ${request.path}`);
  return h.continue;
});

// Error logging
server.ext("onPreResponse", (request, h) => {
  const response = request.response;
  if (response.isBoom) {
    console.error("Error:", response.stack);
  }
  return h.continue;
});
```

**Production Tools:**
- **Application**: Winston/Pino
- **Infrastructure**: CloudWatch/Datadog
- **Error Tracking**: Sentry
- **APM**: New Relic/Datadog

### Metrics to Track

1. **Performance**
   - Request latency (p50, p95, p99)
   - Upload speed
   - Database query time

2. **Availability**
   - Uptime percentage
   - Error rate
   - Failed uploads

3. **Usage**
   - Active users
   - Upload volume
   - Storage usage

4. **Security**
   - Failed login attempts
   - Invalid tokens
   - Suspicious file uploads

---

## Summary

This File Upload System demonstrates:

✅ **Modern Full-Stack Architecture**
- React + TypeScript frontend
- Node.js + Hapi backend
- Type-safe ORM with Prisma

✅ **Security Best Practices**
- JWT authentication
- HttpOnly cookies
- Input validation
- File type checking

✅ **Performance Optimizations**
- Stream-based file handling
- Concurrent upload limiting
- Database indexing
- Client-side caching

✅ **Scalability Considerations**
- Stateless authentication
- Horizontal scaling ready
- Cloud storage compatible
- Microservices-ready

✅ **Developer Experience**
- TypeScript for type safety
- Hot reload in development
- Database migrations
- Comprehensive error handling

This architecture provides a solid foundation that can scale from prototype to production.
