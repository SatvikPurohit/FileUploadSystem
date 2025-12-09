# Common Interview Questions & Answers

## Table of Contents
1. [General Questions](#general-questions)
2. [Architecture Questions](#architecture-questions)
3. [Frontend Questions](#frontend-questions)
4. [Backend Questions](#backend-questions)
5. [Security Questions](#security-questions)
6. [Performance Questions](#performance-questions)
7. [Scenario-Based Questions](#scenario-based-questions)
8. [Improvement Questions](#improvement-questions)

---

## General Questions

### Q1: Walk me through this project in 2 minutes.

**Answer:**
"This is a full-stack file upload system built with React and Node.js. Users can login with email/password, upload multiple files (PDF, DOCX, TXT up to 10MB each), and track upload progress in real-time.

On the frontend, I used React with TypeScript for type safety, Material-UI for components, and React Query for server state management. The UI supports drag-and-drop, shows progress bars, and limits concurrent uploads to 3 files to prevent overwhelming the server.

The backend is built with Hapi.js and uses JWT for authentication with both access and refresh tokens. Files are parsed using Busboy in a streaming fashion to handle large files efficiently. I use Prisma ORM with SQLite for the database, which stores user credentials and file metadata.

Key features include: secure authentication with HttpOnly cookies, file type and size validation on both client and server, real-time progress tracking, and proper error handling. The application is fully TypeScript, making it maintainable and type-safe."

---

### Q2: Why did you choose these technologies?

**Answer:**
"I chose these technologies based on their strengths:

**React**: Component-based architecture makes the UI maintainable and reusable. Large ecosystem and community support.

**TypeScript**: Catches errors at compile-time, makes code self-documenting, and improves developer experience with better IDE support.

**Hapi.js**: Excellent built-in security features, powerful request validation with Joi, and good plugin system. Better suited for file uploads than Express.

**Prisma**: Type-safe database queries, automatic migrations, and works well with TypeScript. Makes database operations less error-prone.

**SQLite**: Perfect for development - no separate database server needed, file-based, and easy to setup. In production, I'd migrate to PostgreSQL.

**Material-UI**: Production-ready components, responsive design, and accessibility built-in. Saves development time.

**React Query**: Handles caching, loading states, and retries automatically. Simplifies server state management."

---

### Q3: What was the most challenging part of this project?

**Answer:**
"The most challenging part was implementing the concurrent upload queue system with proper cancellation support.

**The Problem**: Initially, when users selected 10 files, all 10 would start uploading simultaneously, which:
- Overwhelmed the server
- Made progress bars unreliable
- Could timeout requests
- Provided poor user experience

**The Solution**: I implemented a worker pattern that:
1. Maintains a queue of pending uploads
2. Limits active uploads to 3 concurrent requests
3. Automatically starts next upload when one completes
4. Supports individual file cancellation without affecting others
5. Properly tracks state (PENDING → UPLOADING → SUCCESS/FAILED)

**Key Learnings**:
- Managing async operations with refs to avoid stale closures
- Using AbortController for cancellation
- Coordinating React state updates with async workers
- Preventing race conditions when multiple uploads complete simultaneously

This taught me about task queuing patterns and how to manage complex async state in React."

---

## Architecture Questions

### Q4: Explain the authentication flow in detail.

**Answer:**
"The authentication uses JWT with a dual-token strategy:

**Login Flow:**
1. User submits email/password
2. Backend finds user in database
3. Compares password using bcrypt (hashed passwords never stored plain)
4. If valid, generates two tokens:
   - **Access Token**: Short-lived (15 minutes), used for API requests
   - **Refresh Token**: Long-lived (7 days), used to get new access tokens
5. Both stored in HttpOnly cookies for XSS protection
6. Frontend updates auth context and redirects to /upload

**API Request Flow:**
1. Browser automatically sends token cookie with request
2. Backend JWT middleware verifies token signature
3. Extracts userId from token payload
4. Attaches userId to request.auth.credentials
5. Route handler can access authenticated user

**Token Expiration:**
1. Access token expires after 15 minutes
2. Next API call returns 401 Unauthorized
3. Axios interceptor catches 401
4. Automatically calls /auth/refresh with refresh token
5. Gets new access token
6. Retries original request
7. If refresh token expired, user must re-login

**Why Two Tokens?**
- Access token has short lifespan = limited damage if stolen
- Refresh token is more secure (HttpOnly, longer lifespan)
- Balance between security and user experience
- User stays logged in for 7 days without re-entering password"

---

### Q5: How does the file upload work end-to-end?

**Answer:**
"File upload uses multipart/form-data with streaming:

**Frontend:**
1. User drags files or clicks to select
2. Validate each file:
   - Check type (PDF, DOCX, TXT only)
   - Check size (max 10MB)
3. Create unique ID for each file
4. Add to queue with status PENDING
5. Worker picks up to 3 files
6. For each file:
   - Create FormData with file
   - POST to /api/upload with JWT cookie
   - Track progress via onUploadProgress
   - Update UI with percentage
7. On success: mark SUCCESS
8. On error: mark FAILED with error message
9. Start next file from queue

**Backend:**
1. Verify JWT token (authenticate user)
2. Check Content-Type is multipart/form-data
3. Create Busboy parser with request headers
4. Listen for 'file' events
5. For each file chunk:
   - Validate mimetype (server-side validation)
   - Check accumulated size doesn't exceed 10MB
   - Stream chunk directly to disk
   - Path: /uploads/{userId}/{timestamp}-{filename}
6. No buffering - process as data arrives
7. If error, stop streaming and delete partial file
8. On success, create database record
9. Return file metadata to client

**Key Points:**
- **Streaming**: Memory usage is constant regardless of file size
- **Validation**: Both client and server side
- **Security**: Files organized by userId, no path traversal
- **Progress**: Real-time updates as chunks upload
- **Cancellation**: AbortController stops upload mid-stream"

---

### Q6: Describe the database schema and relationships.

**Answer:**
"The schema has two main entities with a one-to-many relationship:

**User Model:**
```
- id: Primary key, auto-increment
- email: Unique, indexed for fast lookups
- password: Bcrypt hash (never plain text)
- refreshTokenHash: Hashed refresh token
- createdAt: Timestamp
- documents: Relation to Document[]
```

**Document Model:**
```
- id: Primary key, auto-increment
- userId: Foreign key to User, indexed
- filename: Original filename
- path: File system path
- contentType: MIME type (application/pdf, etc.)
- size: File size in bytes
- status: success/failed
- createdAt: Timestamp, indexed for sorting
- uploadedAt: When upload completed
- user: Relation back to User
```

**Relationships:**
- One User has many Documents
- Each Document belongs to one User
- Cascading: If user deleted, their documents could be too (not implemented)

**Indexing Strategy:**
- `User.email`: Fast login queries
- `Document.userId`: Fast user's documents query
- `Document.createdAt`: Fast sorting by upload date

**Why This Design:**
- Simple and normalized (3NF)
- Efficient queries with proper indexes
- Easy to extend (add tags, folders, versions)
- Foreign key ensures data integrity"

---

## Frontend Questions

### Q7: How do you manage state in the React application?

**Answer:**
"I use a combination of state management strategies:

**1. Component State (useState):**
- Local UI state (form inputs, loading flags)
- Upload queue and progress
- Snackbar notifications
```typescript
const [queue, setQueue] = useState<UploadItem[]>([]);
const [email, setEmail] = useState("");
```

**2. Context API (AuthContext):**
- Global auth state (logged in/out)
- Current user information
- Shared across components
```typescript
const AuthContext = createContext({
  isAuthenticated: false,
  login: () => {},
  logout: () => {}
});
```

**3. React Query:**
- Server state (API data)
- Automatic caching
- Loading/error states
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["documents"],
  queryFn: fetchDocuments
});
```

**4. Refs (useRef):**
- Non-reactive data (file objects, active upload count)
- Prevents unnecessary re-renders
- Mutable values in async operations
```typescript
const fileMap = useRef<Map<string, File>>(new Map());
const activeCountRef = useRef(0);
```

**Why This Approach:**
- **useState**: Good for local, frequently changing state
- **Context**: Prevents prop drilling for auth state
- **React Query**: Server state is different from UI state
- **Refs**: Performance optimization for worker pattern

**Avoided Redux** because:
- Application is small enough
- React Query handles server state
- Context + useState sufficient for UI state
- Less boilerplate needed"

---

### Q8: How did you implement the concurrent upload limiting?

**Answer:**
"I used a worker pattern with a task queue:

**Data Structures:**
```typescript
const queue = useState<UploadItem[]>([]);      // UI state
const fileMap = useRef<Map<string, File>>();    // File objects
const tasksRef = useRef<string[]>([]);          // Queue of IDs
const activeCountRef = useRef(0);                // Active uploads
const activeIdsRef = useRef<Set<string>>();     // Prevent duplicates
```

**Worker Logic:**
```typescript
const startWorker = useCallback(() => {
  while (true) {
    // Stop if no tasks
    if (!tasksRef.current.length) break;
    
    // Stop if at limit
    if (activeCountRef.current >= CONCURRENCY) break;
    
    // Get next task
    const id = tasksRef.current.shift();
    const item = queue.find(x => x.id === id);
    
    // Skip if not pending
    if (item.status !== "PENDING") continue;
    
    // Prevent duplicate starts
    if (activeIdsRef.current.has(id)) continue;
    activeIdsRef.current.add(id);
    
    // Start upload
    activeCountRef.current++;
    uploadFile(item);
  }
}, []);
```

**On Upload Complete:**
```typescript
onSuccess: () => {
  // Decrement counter
  activeCountRef.current--;
  activeIdsRef.current.delete(id);
  
  // Update status
  updateQueue(prev => 
    prev.map(it => 
      it.id === id ? { ...it, status: "SUCCESS" } : it
    )
  );
  
  // Start next upload
  startWorker();
}
```

**Key Patterns:**
1. **Task Queue**: IDs of pending uploads
2. **Active Counter**: Enforce hard limit of 3
3. **Worker Loop**: Continuously processes queue
4. **Completion Callback**: Triggers next upload
5. **Idempotency**: activeIdsRef prevents duplicate starts

**Challenges Solved:**
- Race conditions (multiple uploads completing simultaneously)
- Stale closures (using refs instead of state in callbacks)
- Queue synchronization (enqueuePending keeps tasksRef updated)
- Cancellation (AbortController + proper cleanup)"

---

### Q9: How do you handle errors in the frontend?

**Answer:**
"I use a layered error handling approach:

**1. API Level (Axios Interceptors):**
```typescript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Try refresh token
      return refreshAndRetry(error.config);
    }
    return Promise.reject(error);
  }
);
```

**2. Component Level (Try-Catch):**
```typescript
try {
  await loginClient(email, password);
  navigate("/upload");
} catch (err) {
  setError(err?.response?.data?.message || "Login failed");
}
```

**3. Upload Level (Mutation Callbacks):**
```typescript
const mutation = useMutation({
  mutationFn: uploadFile,
  onError: (error, vars) => {
    // Update item status
    updateQueue(prev =>
      prev.map(it =>
        it.id === vars.item.id
          ? { ...it, status: "FAILED", error: error.message }
          : it
      )
    );
    
    // Show notification
    setSnack({ open: true, msg: "Upload failed", severity: "error" });
  }
});
```

**4. UI Level (Error Display):**
```typescript
{error && (
  <Typography color="error">
    {error}
  </Typography>
)}

{item.status === "FAILED" && (
  <Typography color="error">
    FAILED - {item.error}
  </Typography>
)}
```

**Error Types:**
- **Network Errors**: Show retry button
- **Validation Errors**: Show inline on form fields
- **Auth Errors**: Redirect to login
- **Upload Errors**: Mark file as failed, allow retry

**User Experience:**
- Clear, actionable error messages
- No technical jargon exposed
- Retry options where appropriate
- Graceful degradation"

---

## Backend Questions

### Q10: Why did you use Busboy for file uploads?

**Answer:**
"Busboy is a streaming parser for multipart/form-data. I chose it for several key reasons:

**1. Memory Efficiency:**
```typescript
// Without streaming (bad):
const buffer = await readFileSync(path); // Entire file in memory
// If file is 500MB, uses 500MB RAM

// With streaming (good):
fileStream.pipe(writeStream); // Process in chunks
// Only 64KB chunks in memory at a time
```

**2. Real-Time Processing:**
- Start validation immediately (don't wait for entire upload)
- Can reject files early (save bandwidth)
- Write to disk as data arrives

**3. Large File Support:**
- Can handle files larger than available RAM
- No 'request body too large' errors
- Scalable to any file size

**4. Progress Tracking:**
```typescript
fileStream.on("data", (chunk) => {
  bytes += chunk.length;
  // Can send progress updates here
});
```

**5. Concurrent File Handling:**
- Processes multiple files from same request
- Each file streams independently
- No buffering required

**Alternatives Considered:**
- **Multer**: Buffers small files, not as flexible
- **Formidable**: Stores temp files on disk (cleanup issues)
- **Native parsing**: Complex, error-prone

**Real-World Impact:**
- User uploads 50MB file: Uses ~64KB RAM (not 50MB)
- 10 concurrent uploads: Still manageable memory
- Can handle files bigger than server RAM"

---

### Q11: How do you ensure file upload security?

**Answer:**
"I implement multiple layers of security:

**1. Authentication:**
```typescript
{
  method: "POST",
  path: "/api/upload",
  options: { auth: "jwt" }  // Requires valid token
}
```

**2. File Type Validation:**
```typescript
// Server-side (can't be bypassed)
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

if (!ALLOWED.includes(mimetype)) {
  fileStream.resume();  // Discard
  throw new Error("Invalid file type");
}
```

**3. File Size Limiting:**
```typescript
let fileBytes = 0;
fileStream.on("data", (chunk) => {
  fileBytes += chunk.length;
  if (fileBytes > MAX_BYTES) {
    // Stop immediately
    writeStream.destroy();
    fileStream.destroy();
  }
});
```

**4. Path Traversal Prevention:**
```typescript
// User sends: "../../../etc/passwd"
const safeName = path.basename(filename);
// Result: "passwd" (safe)

const savePath = path.join(UPLOADS_DIR, userId, safeName);
// Result: /uploads/123/passwd (contained)
```

**5. User Isolation:**
```typescript
// Files saved per user
/uploads/
  1/        // User 1's files
  2/        // User 2's files
  3/        // User 3's files

// Can only access own userId folder
```

**6. Content-Type Verification:**
```typescript
const contentType = req.headers["content-type"];
if (!contentType.startsWith("multipart/form-data")) {
  return h.response({ error: "Invalid content-type" }).code(415);
}
```

**7. Input Sanitization:**
```typescript
// Remove dangerous characters from filename
const sanitized = filename
  .replace(/[^a-zA-Z0-9.-]/g, "_")
  .substring(0, 255);  // Limit length
```

**Additional Measures (Production):**
- Virus scanning (ClamAV, VirusTotal API)
- File content inspection (magic numbers)
- Rate limiting (prevent abuse)
- File quarantine period
- Audit logging"

---

### Q12: How does JWT authentication work in Hapi?

**Answer:**
"JWT authentication in Hapi uses the hapi-auth-jwt2 plugin:

**1. Registration:**
```typescript
await server.register(hapiAuthJwt2);

server.auth.strategy("jwt", "jwt", {
  key: JWT_SECRET,              // Signing key
  validate: validateFunction,    // Token verification
  verifyOptions: {               // JWT options
    algorithms: ["HS256"]
  },
  cookieKey: "token"            // Look for token in cookie
});
```

**2. Validation Function:**
```typescript
const validate = async (decoded, request, h) => {
  // decoded = JWT payload
  // { sub: 1, iat: 1234567890, exp: 1234568790 }
  
  const userId = decoded?.id || decoded?.sub;
  
  // Check if user exists (optional)
  // const user = await prisma.user.findUnique({ where: { id: userId } });
  
  const isValid = Boolean(userId);
  const credentials = { id: userId };  // Attached to request
  
  return { isValid, credentials };
};
```

**3. Protected Routes:**
```typescript
{
  method: "POST",
  path: "/api/upload",
  options: {
    auth: "jwt"  // Requires authentication
  },
  handler: async (request, h) => {
    const userId = request.auth.credentials.id;
    // userId is guaranteed to exist here
  }
}
```

**4. Public Routes:**
```typescript
{
  method: "POST",
  path: "/api/auth/login",
  options: {
    auth: false  // No authentication required
  }
}
```

**Token Flow:**
```
1. Login → Server generates JWT
2. Server sets HttpOnly cookie
3. Browser automatically sends cookie with requests
4. Hapi reads cookie, extracts token
5. Verifies signature with JWT_SECRET
6. Decodes payload
7. Calls validate function
8. Attaches credentials to request
9. Handler can access authenticated user
```

**Benefits:**
- **Stateless**: No session storage needed
- **Scalable**: Works across multiple servers
- **Secure**: Signature prevents tampering
- **Flexible**: Can include any claims in payload

**Cookie vs Header:**
```typescript
// Cookie (current implementation)
cookieKey: "token"
// Browser automatically sends

// Header (alternative)
headerKey: "authorization"
// Must send manually: Authorization: Bearer <token>
```

I chose cookies because:
- HttpOnly flag prevents XSS
- Automatic sending
- Works better with browser security policies"

---

## Security Questions

### Q13: How do you protect against XSS attacks?

**Answer:**
"XSS (Cross-Site Scripting) is when attackers inject malicious JavaScript. I protect against it:

**1. HttpOnly Cookies:**
```typescript
h.state("token", accessToken, {
  isHttpOnly: true,  // JavaScript can't access
  isSecure: true,    // HTTPS only (production)
  isSameSite: "Lax"  // CSRF protection
});
```

**2. React's Built-in Protection:**
```jsx
// React escapes by default
<div>{userInput}</div>
// If userInput = "<script>alert('xss')</script>"
// Renders as text, not executed
```

**3. Avoid dangerouslySetInnerHTML:**
```jsx
// ❌ Dangerous:
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe:
<div>{userInput}</div>
```

**4. Content Security Policy (Production):**
```typescript
response.header(
  "Content-Security-Policy",
  "default-src 'self'; script-src 'self'"
);
```

**5. Input Validation:**
```typescript
// Validate email format
validate: {
  payload: Joi.object({
    email: Joi.string().email().required()
  })
}
```

**6. Sanitize File Names:**
```typescript
const safeName = filename
  .replace(/[<>:"/\\|?*]/g, "_")  // Remove dangerous chars
  .substring(0, 255);               // Limit length
```

**Real Attack Scenario:**
```
Attacker uploads file named:
  <script>alert('xss')</script>.pdf

Without sanitization:
  Filename displayed on page → Script executes

With sanitization:
  Filename becomes: _script_alert__xss___script_.pdf
  Displays as text only
```

**Best Practices:**
- Never insert untrusted data into HTML
- Always validate and sanitize input
- Use HttpOnly cookies for sensitive data
- Trust React's default escaping
- Be extra careful with file uploads"

---

### Q14: How would you prevent CSRF attacks?

**Answer:**
"CSRF (Cross-Site Request Forgery) is when a malicious site makes requests on your behalf. Prevention:

**Current Implementation:**

**1. SameSite Cookies:**
```typescript
h.state("token", accessToken, {
  isSameSite: "Lax"  // Don't send on cross-site requests
});
```

**2. CORS Configuration:**
```typescript
cors: {
  origin: [FRONTEND_URL],  // Only allow our frontend
  credentials: true         // Required for cookies
}
```

**3. CSRF Token (Implemented):**
```typescript
// On login, generate CSRF token
const csrf = crypto.randomBytes(24).toString("hex");
h.state("csrf_token", csrf, {
  isHttpOnly: false  // Frontend needs to read this
});

// On sensitive operations, verify
const verifyCsrf = async (request, h) => {
  const csrfCookie = request.state.csrf_token;
  const csrfHeader = request.headers["x-csrf-token"];
  
  if (csrfCookie !== csrfHeader) {
    throw Boom.forbidden("Invalid CSRF token");
  }
  
  return h.continue;
};

// Apply to routes
{
  method: "POST",
  path: "/api/auth/logout",
  options: {
    pre: [{ method: verifyCsrf }]
  }
}
```

**Better Implementation (Production):**

**4. Double-Submit Cookie Pattern:**
```typescript
// Set CSRF token in cookie
h.state("csrf_token", token, { isHttpOnly: false });

// Frontend reads and sends in header
axios.interceptors.request.use(config => {
  const csrfToken = getCookie("csrf_token");
  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

// Backend verifies they match
if (cookieToken !== headerToken) {
  throw Error("CSRF token mismatch");
}
```

**5. Origin/Referer Checking:**
```typescript
server.ext("onRequest", (request, h) => {
  const origin = request.headers.origin;
  const referer = request.headers.referer;
  
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return h.response({ error: "Invalid origin" }).code(403).takeover();
  }
  
  return h.continue;
});
```

**Attack Scenario:**
```
1. User logs into your-app.com
2. Browser stores auth cookie
3. User visits evil.com
4. evil.com has: <form action="your-app.com/api/upload" method="POST">
5. Form submits automatically
6. Browser sends auth cookie (user is authenticated!)
7. Upload happens without user consent

Prevention:
- SameSite cookie: Browser won't send cookie from evil.com
- CORS: Server rejects requests from evil.com
- CSRF token: evil.com doesn't know the token
```

**Why Multiple Layers:**
- Defense in depth
- Browser compatibility
- Different attack vectors
- Redundancy if one fails"

---

### Q15: How do you handle password security?

**Answer:**
"Password security uses industry best practices:

**1. Hashing with Bcrypt:**
```typescript
import bcrypt from "bcryptjs";

// On registration/password change
const hashedPassword = await bcrypt.hash(password, 10);
// 10 = cost factor (work rounds)

// On login
const match = await bcrypt.compare(password, user.password);
```

**Why Bcrypt:**
- **Slow**: Intentionally takes time (prevents brute force)
- **Salted**: Each password gets unique salt (prevents rainbow tables)
- **Adaptive**: Can increase cost factor as computers get faster

**2. Password Validation:**
```typescript
validate: {
  payload: Joi.object({
    password: Joi.string()
      .min(8)           // Minimum length
      .max(128)         // Maximum length
      .required()
  })
}
```

**3. Never Log Passwords:**
```typescript
// ❌ Bad:
console.log("Login attempt:", { email, password });

// ✅ Good:
console.log("Login attempt:", { email, passwordLength: password.length });
```

**4. Generic Error Messages:**
```typescript
// ❌ Bad (reveals user exists):
if (!user) return "User not found";
if (!match) return "Password incorrect";

// ✅ Good (same message):
if (!user || !match) return "Invalid credentials";
```

**5. Secure Transmission:**
```typescript
// Use HTTPS in production
isSecure: process.env.NODE_ENV === "production"
```

**6. Rate Limiting (Production):**
```typescript
const loginAttempts = new Map();

const checkRateLimit = (email) => {
  const attempts = loginAttempts.get(email) || 0;
  if (attempts >= 5) {
    throw new Error("Too many attempts. Try again in 15 minutes.");
  }
  loginAttempts.set(email, attempts + 1);
};
```

**7. Password Expiry (Enterprise):**
```prisma
model User {
  passwordChangedAt DateTime?
  passwordExpiresAt DateTime?
}
```

**Best Practices:**
- Never store plain-text passwords
- Never decrypt passwords (impossible with bcrypt)
- Use high cost factor (10-12)
- Enforce minimum length
- Rate limit login attempts
- Use HTTPS
- Consider 2FA for sensitive apps

**Why Bcrypt Over Others:**
- **MD5/SHA**: Too fast, not designed for passwords
- **PBKDF2**: Good, but bcrypt more widely used
- **Argon2**: Better, but bcrypt battle-tested
- **Scrypt**: Good, but bcrypt simpler"

---

## Performance Questions

### Q16: How do you optimize file upload performance?

**Answer:**
"I use several optimization techniques:

**1. Streaming (Memory):**
```typescript
// Process file in chunks
fileStream.pipe(writeStream);
// Memory: 64KB (chunk size)
// vs buffering: 500MB (entire file)
```

**2. Concurrent Upload Limiting:**
```typescript
const CONCURRENCY = 3;
// Allows 3 uploads at once
// More = network congestion
// Less = underutilized bandwidth
```

**3. Chunk Size (Browser):**
```typescript
// Browser automatically chunks
// Typical: 64KB chunks
// Good balance of progress updates and overhead
```

**4. Connection Keep-Alive:**
```typescript
// HTTP/1.1 keeps connection open
// Avoids TCP handshake overhead for multiple uploads
```

**5. Frontend Optimizations:**
```typescript
// Use refs for non-reactive data
const fileMap = useRef<Map<string, File>>(new Map());
// Avoids re-renders when file data changes

// Batch state updates
updateQueue(prev => {
  // Multiple changes in one update
  return prev.map(it => {
    if (it.id === id1) return { ...it, progress: 50 };
    if (it.id === id2) return { ...it, progress: 75 };
    return it;
  });
});
```

**6. Compression (Future):**
```typescript
// Gzip text files before upload
// Can reduce size by 70-90%
const compressed = pako.gzip(content);
```

**7. Direct Upload to CDN (Future):**
```typescript
// Get presigned URL from backend
const { uploadUrl } = await getPresignedUrl();

// Upload directly to S3
await axios.put(uploadUrl, file);

// Bypasses backend entirely
```

**Performance Metrics:**

| Scenario | Memory | Speed | User Experience |
|----------|--------|-------|-----------------|
| **No Streaming** | 500MB | Slow | Freezes |
| **Streaming** | 64KB | Fast | Smooth |
| **No Concurrency** | Low | Slow | Sequential |
| **Concurrency=3** | Moderate | Fast | Parallel |
| **Concurrency=10** | High | Slow | Congested |

**Bottlenecks Identified:**
1. **Network**: Limited by user's upload speed
2. **Disk I/O**: SSD vs HDD makes big difference
3. **CPU**: Minimal (streaming avoids processing)
4. **Memory**: Non-issue with streaming

**Monitoring (Production):**
```typescript
// Track upload times
const startTime = Date.now();
fileStream.on("finish", () => {
  const duration = Date.now() - startTime;
  const speed = fileSize / (duration / 1000); // bytes/sec
  console.log(`Upload speed: ${speed / 1024 / 1024} MB/s`);
});
```"

---

### Q17: How would you scale this system to handle 10,000 concurrent users?

**Answer:**
"Scaling requires changes at every level:

**1. Load Balancer:**
```
┌──────────┐
│  Users   │
└────┬─────┘
     │
┌────▼─────────┐
│  Load        │  NGINX / AWS ALB
│  Balancer    │  Distributes requests
└────┬─────────┘
     │
     ├──────────┬──────────┬──────────┐
     │          │          │          │
┌────▼────┐ ┌──▼───────┐ ┌▼────────┐ ...
│ Backend │ │ Backend  │ │ Backend │
│ Node 1  │ │ Node 2   │ │ Node 3  │
└─────────┘ └──────────┘ └─────────┘
```

**2. Database:**
```typescript
// Migrate to PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  connection_limit: 20  // Per instance
});

// Add read replicas
- Master: Writes
- Replicas: Reads
```

**3. File Storage:**
```typescript
// Move to S3
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

await s3.send(new PutObjectCommand({
  Bucket: "my-uploads",
  Key: `${userId}/${filename}`,
  Body: fileStream,
  ContentType: mimetype
}));

// Benefits:
- Unlimited storage
- High availability
- CDN integration
- No server disk usage
```

**4. Caching:**
```typescript
// Redis for session/token cache
import Redis from "ioredis";
const redis = new Redis();

// Cache user data
await redis.set(`user:${userId}`, JSON.stringify(user), "EX", 3600);

// Cache document metadata
await redis.set(`docs:${userId}`, JSON.stringify(documents), "EX", 300);
```

**5. Rate Limiting:**
```typescript
// Per user
await server.register({
  plugin: HapiRateLimit,
  options: {
    userLimit: 10,           // 10 uploads
    userCache: {
      expiresIn: 60000      // per minute
    }
  }
});
```

**6. Background Processing:**
```typescript
// Queue for heavy tasks
import Bull from "bull";
const uploadQueue = new Bull("uploads");

// Producer
await uploadQueue.add({ userId, fileId });

// Consumer
uploadQueue.process(async (job) => {
  await virusScan(job.data.fileId);
  await generateThumbnail(job.data.fileId);
  await notifyUser(job.data.userId);
});
```

**7. CDN for Static Assets:**
```
Users → CloudFront CDN → S3 (Files)
      → Load Balancer → Backend (API)
```

**8. Monitoring:**
```typescript
// Application Performance Monitoring
import Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });

// Metrics
import StatsD from "node-statsd";
statsd.increment("uploads.count");
statsd.timing("uploads.duration", duration);
```

**9. Horizontal Scaling:**
```typescript
// Stateless backend (no local sessions)
// Can add/remove instances dynamically
// Load balancer distributes evenly

// Auto-scaling rules:
- CPU > 70% → Add instance
- CPU < 30% → Remove instance
```

**10. Database Optimization:**
```sql
-- Partitioning large tables
CREATE TABLE documents_2024_01 PARTITION OF documents
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Materialized views
CREATE MATERIALIZED VIEW user_stats AS
  SELECT userId, COUNT(*) as uploadCount
  FROM documents
  GROUP BY userId;
```

**Cost-Performance Trade-offs:**

| Users | Setup | Monthly Cost |
|-------|-------|--------------|
| 100 | Single server | $20 |
| 1,000 | 2 servers + RDS | $200 |
| 10,000 | 10 servers + RDS + S3 | $2,000 |
| 100,000 | Auto-scaling + CDN | $10,000+ |

**Key Principles:**
- Stateless services (easy to scale)
- Offload storage to cloud
- Cache aggressively
- Queue heavy operations
- Monitor everything
- Scale horizontally, not vertically"

---

## Scenario-Based Questions

### Q18: A user reports their upload is stuck at 99%. How do you debug?

**Answer:**
"I would follow a systematic debugging process:

**1. Check Frontend:**
```typescript
// Add detailed logging
onUploadProgress: (progressEvent) => {
  const percent = Math.round(
    (progressEvent.loaded * 100) / progressEvent.total
  );
  console.log("Progress event:", {
    loaded: progressEvent.loaded,
    total: progressEvent.total,
    percent,
    timestamp: Date.now()
  });
}
```

**2. Check Browser Network Tab:**
- Is request still pending?
- What's the status?
- Are there any errors?
- Check Response Headers for errors

**3. Check Backend Logs:**
```typescript
// In upload handler
fileStream.on("data", (chunk) => {
  totalBytes += chunk.length;
  console.log(`Received ${totalBytes} bytes of ${expectedSize}`);
});

fileStream.on("end", () => {
  console.log("File stream ended");
});

busboy.on("finish", () => {
  console.log("Busboy finished parsing");
});
```

**4. Common Causes:**

**A. Progress Calculation Bug:**
```typescript
// Bug: Division by zero or undefined
const percent = (loaded * 100) / total;
// If total is 0 or undefined → NaN

// Fix: Guard against invalid values
const percent = total > 0
  ? Math.round((loaded * 100) / total)
  : 0;
```

**B. Last Chunk Not Reported:**
```typescript
// Bug: Progress event doesn't fire for last chunk
// Solution: Set progress to 100% on success
onSuccess: () => {
  updateQueue(prev =>
    prev.map(it =>
      it.id === itemId
        ? { ...it, progress: 100, status: "SUCCESS" }
        : it
    )
  );
}
```

**C. Backend Hanging:**
```typescript
// Add timeouts
axios.post("/upload", formData, {
  timeout: 300000,  // 5 minutes
  onUploadProgress: ...
});

// Backend: Set request timeout
server.route({
  options: {
    timeout: {
      server: 300000  // 5 minutes
    }
  }
});
```

**D. File Write Not Finishing:**
```typescript
// Ensure proper stream cleanup
writeStream.on("finish", async () => {
  console.log("Write stream finished");
  // Create DB record
  await prisma.document.create({ ... });
  // Send response
  resolve(h.response({ ok: true }));
});

writeStream.on("error", (err) => {
  console.error("Write stream error:", err);
  reject(err);
});
```

**5. Add Detailed Status:**
```typescript
type UploadStatus =
  | "PENDING"
  | "UPLOADING"
  | "PROCESSING"    // New: backend processing
  | "FINALIZING"    // New: saving to DB
  | "SUCCESS"
  | "FAILED";

// Update as upload progresses
- Upload starts: UPLOADING
- Last byte sent: PROCESSING
- DB record created: FINALIZING
- Response received: SUCCESS
```

**6. Reproduce:**
```typescript
// Test with different file sizes
- Small file (1MB): Works?
- Medium file (5MB): Works?
- Large file (10MB): Stuck?

// Test on different networks
- Fast WiFi: Works?
- Slow 3G: Stuck?

// Narrow down the issue
```

**7. Preventive Measures:**
```typescript
// Add upload timeout warning
useEffect(() => {
  const timer = setTimeout(() => {
    if (item.progress > 90 && item.progress < 100) {
      console.warn(`Upload ${item.id} stuck at ${item.progress}%`);
      // Offer manual retry
    }
  }, 60000); // 1 minute
  
  return () => clearTimeout(timer);
}, [item.progress]);
```

**Resolution Process:**
1. Gather information (logs, network tab, user details)
2. Reproduce issue locally
3. Identify root cause
4. Implement fix
5. Add tests to prevent regression
6. Deploy hotfix
7. Monitor for similar issues"

---

### Q19: How would you implement resume functionality for failed uploads?

**Answer:**
"Resumable uploads require chunking and state tracking:

**Frontend Implementation:**

**1. Chunk File:**
```typescript
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

const chunkFile = (file: File): Blob[] => {
  const chunks: Blob[] = [];
  let offset = 0;
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    chunks.push(chunk);
    offset += CHUNK_SIZE;
  }
  
  return chunks;
};
```

**2. Upload Chunks:**
```typescript
const uploadChunked = async (file: File, uploadId: string) => {
  const chunks = chunkFile(file);
  let uploadedChunks = 0;
  
  // Try to resume from checkpoint
  const checkpoint = await getCheckpoint(uploadId);
  if (checkpoint) {
    uploadedChunks = checkpoint.chunkIndex;
  }
  
  // Upload remaining chunks
  for (let i = uploadedChunks; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      await uploadChunk({
        uploadId,
        chunkIndex: i,
        totalChunks: chunks.length,
        chunk
      });
      
      // Save checkpoint
      await saveCheckpoint(uploadId, i);
      
      // Update progress
      const progress = Math.round(((i + 1) / chunks.length) * 100);
      updateProgress(uploadId, progress);
      
    } catch (error) {
      // Save current position and stop
      await saveCheckpoint(uploadId, i);
      throw error;
    }
  }
  
  // Finalize
  await finalizeUpload(uploadId);
};
```

**3. Backend API:**
```typescript
// 1. Initialize upload
POST /api/upload/init
{
  "filename": "large-file.pdf",
  "size": 50000000,
  "chunkSize": 1048576
}

Response:
{
  "uploadId": "abc123",
  "totalChunks": 48
}

// 2. Upload chunk
POST /api/upload/chunk
{
  "uploadId": "abc123",
  "chunkIndex": 5,
  "chunk": <binary data>
}

Response:
{
  "received": 5,
  "remaining": 43
}

// 3. Get status (for resume)
GET /api/upload/status/{uploadId}

Response:
{
  "uploadId": "abc123",
  "uploadedChunks": [0, 1, 2, 3, 4],
  "totalChunks": 48
}

// 4. Finalize
POST /api/upload/finalize
{
  "uploadId": "abc123"
}
```

**Backend Implementation:**

```typescript
// 1. Initialize
{
  method: "POST",
  path: "/api/upload/init",
  handler: async (request, h) => {
    const { filename, size, chunkSize } = request.payload;
    const uploadId = crypto.randomUUID();
    
    // Create temp directory
    const uploadDir = path.join(TEMP_DIR, uploadId);
    await mkdirp(uploadDir);
    
    // Store metadata
    await prisma.uploadSession.create({
      data: {
        id: uploadId,
        userId: request.auth.credentials.id,
        filename,
        size,
        chunkSize,
        totalChunks: Math.ceil(size / chunkSize),
        status: "in_progress"
      }
    });
    
    return { uploadId, totalChunks };
  }
}

// 2. Receive chunk
{
  method: "POST",
  path: "/api/upload/chunk",
  handler: async (request, h) => {
    const { uploadId, chunkIndex, chunk } = request.payload;
    
    // Verify ownership
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId }
    });
    
    if (session.userId !== request.auth.credentials.id) {
      return h.response({ error: "Unauthorized" }).code(403);
    }
    
    // Save chunk
    const chunkPath = path.join(TEMP_DIR, uploadId, `chunk-${chunkIndex}`);
    await fs.promises.writeFile(chunkPath, chunk);
    
    // Update session
    await prisma.uploadChunk.create({
      data: {
        uploadSessionId: uploadId,
        chunkIndex,
        size: chunk.length
      }
    });
    
    const uploadedChunks = await prisma.uploadChunk.count({
      where: { uploadSessionId: uploadId }
    });
    
    return {
      received: uploadedChunks,
      remaining: session.totalChunks - uploadedChunks
    };
  }
}

// 3. Finalize
{
  method: "POST",
  path: "/api/upload/finalize",
  handler: async (request, h) => {
    const { uploadId } = request.payload;
    
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } }
    });
    
    // Verify all chunks present
    if (session.chunks.length !== session.totalChunks) {
      return h.response({ error: "Incomplete upload" }).code(400);
    }
    
    // Combine chunks
    const finalPath = path.join(UPLOADS_DIR, session.userId, session.filename);
    const writeStream = fs.createWriteStream(finalPath);
    
    for (const chunk of session.chunks) {
      const chunkPath = path.join(TEMP_DIR, uploadId, `chunk-${chunk.chunkIndex}`);
      const chunkData = await fs.promises.readFile(chunkPath);
      writeStream.write(chunkData);
    }
    
    writeStream.end();
    
    // Clean up temp files
    await fs.promises.rm(path.join(TEMP_DIR, uploadId), { recursive: true });
    
    // Create document record
    await prisma.document.create({
      data: {
        userId: session.userId,
        filename: session.filename,
        path: finalPath,
        size: session.size
      }
    });
    
    // Delete session
    await prisma.uploadSession.delete({ where: { id: uploadId } });
    
    return { ok: true };
  }
}
```

**Resume Logic:**

```typescript
const resumeUpload = async (uploadId: string, file: File) => {
  // Get current status
  const status = await axios.get(`/api/upload/status/${uploadId}`);
  const { uploadedChunks, totalChunks } = status.data;
  
  // Chunk file
  const chunks = chunkFile(file);
  
  // Upload missing chunks only
  for (let i = 0; i < chunks.length; i++) {
    if (uploadedChunks.includes(i)) {
      // Already uploaded, skip
      updateProgress(i, totalChunks);
      continue;
    }
    
    // Upload missing chunk
    await uploadChunk(uploadId, i, chunks[i]);
  }
  
  // Finalize
  await finalizeUpload(uploadId);
};
```

**Benefits:**
- Network failure: Resume from last chunk
- Browser refresh: Resume from saved state
- Pause/resume: User control
- Large files: More reliable

**Trade-offs:**
- More complex code
- Server storage for temp chunks
- Multiple HTTP requests
- Requires cleanup mechanism"

---

## Improvement Questions

### Q20: What would you improve if you had more time?

**Answer:**
"I would prioritize these improvements:

**1. Cloud Storage Migration (High Priority):**
```typescript
// Current: Local storage doesn't scale
// Improvement: AWS S3 or Azure Blob Storage

import { S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Direct upload to S3 (bypasses backend)
const getUploadUrl = async (filename) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${userId}/${filename}`
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

// Benefits:
- Unlimited storage
- Global CDN
- No server disk usage
- Better performance
```

**2. File Versioning:**
```prisma
model Document {
  id        Int       @id
  filename  String
  version   Int       @default(1)
  parentId  Int?
  parent    Document? @relation("Versions", fields: [parentId])
  versions  Document[] @relation("Versions")
}

// UI: Show version history
// Allow restore of previous versions
```

**3. Advanced Search & Filtering:**
```typescript
// Add full-text search
model Document {
  id          Int    @id
  filename    String
  tags        String[]
  description String?
  
  @@index([filename])
  @@index([tags])
}

// Search by:
- Filename
- Upload date range
- File type
- Tags
- Size
```

**4. Virus Scanning:**
```typescript
import clamav from "clamav.js";

// Scan after upload
const scanResult = await clamav.scanFile(filePath);
if (scanResult.isInfected) {
  await quarantineFile(filePath);
  await notifyAdmin(userId, filename);
  throw new Error("Virus detected");
}
```

**5. File Compression:**
```typescript
import sharp from "sharp";  // Images
import pako from "pako";     // Text files

// Compress images
if (mimetype.startsWith("image/")) {
  await sharp(buffer)
    .resize(1920, 1080, { fit: "inside" })
    .jpeg({ quality: 80 })
    .toFile(compressedPath);
}

// Compress text
if (mimetype === "text/plain") {
  const compressed = pako.gzip(buffer);
  // Save 70-90% space
}
```

**6. Real-time Notifications:**
```typescript
// WebSocket for live updates
import { Server } from "socket.io";

const io = new Server(httpServer);

// Emit progress to specific user
io.to(`user:${userId}`).emit("upload:progress", {
  fileId,
  percent,
  status
});

// Benefits:
- No polling
- Instant updates
- Lower server load
```

**7. Batch Operations:**
```typescript
// Download multiple files as ZIP
POST /api/download/batch
{
  "documentIds": [1, 2, 3, 4, 5]
}

// Create ZIP on-the-fly
import archiver from "archiver";

const archive = archiver("zip");
documentIds.forEach(id => {
  archive.file(document.path, { name: document.filename });
});
archive.pipe(response);
```

**8. Analytics Dashboard:**
```typescript
// Track metrics
- Upload success rate
- Average upload time
- Most uploaded file types
- Storage usage per user
- Peak usage times

// Display in admin panel
```

**9. Advanced Access Control:**
```prisma
model Document {
  isPublic   Boolean @default(false)
  sharedWith User[]
  permissions Permission[]
}

model Permission {
  userId      Int
  documentId  Int
  canView     Boolean
  canDownload Boolean
  canShare    Boolean
}
```

**10. Testing:**
```typescript
// Unit tests
describe("Upload Service", () => {
  it("should reject files over 10MB", async () => {
    const largeFile = createMockFile(11 * 1024 * 1024);
    await expect(uploadService.upload(largeFile)).rejects.toThrow();
  });
});

// Integration tests
describe("Upload API", () => {
  it("should upload and retrieve file", async () => {
    const response = await request(app)
      .post("/api/upload")
      .attach("file", "test.pdf");
    
    expect(response.status).toBe(200);
  });
});

// E2E tests
test("user can upload and see file in list", async ({ page }) => {
  await page.goto("/upload");
  await page.setInputFiles("input[type=file]", "test.pdf");
  await expect(page.locator("text=test.pdf")).toBeVisible();
});
```

**Priority Order:**
1. Cloud Storage (critical for scaling)
2. Virus Scanning (security)
3. Real-time Updates (UX)
4. Testing (quality)
5. Search/Filtering (features)
6. Versioning (advanced features)
7. Compression (optimization)
8. Analytics (insights)
9. Batch Operations (convenience)
10. Advanced ACL (enterprise)"

---

## Summary

These questions cover:
- **Basics**: HTTP, authentication, file uploads
- **Architecture**: System design, data flow
- **Security**: XSS, CSRF, password handling
- **Performance**: Optimization, scaling
- **Real-world**: Debugging, improvements

**Interview Tips:**
1. Start with high-level overview
2. Dive into details when asked
3. Explain trade-offs
4. Discuss alternatives considered
5. Show learning attitude
6. Be honest about what you don't know

**Practice:**
- Explain each component out loud
- Draw architecture diagrams
- Walk through code flows
- Discuss improvements
- Answer "why" for every decision

Good luck! 🚀
