# Quick Reference Guide - Interview Day Cheat Sheet

> 🚀 **Last-Minute Review Before Interview**
> 
> Print this page and review it 30 minutes before your interview!

## 30-Second Project Pitch

*"I built a full-stack file upload system with React and Node.js. Users authenticate with JWT tokens, upload files up to 10MB with real-time progress bars, and the system limits concurrent uploads to prevent server overload. It uses streaming for memory efficiency, validates files on both client and server, and stores everything securely per user. The tech stack is React, TypeScript, Material-UI on the frontend, and Hapi, Prisma, SQLite on the backend."*

---

## Key Numbers to Remember

| Metric | Value |
|--------|-------|
| **Max file size** | 10 MB |
| **Concurrent uploads** | 3 files |
| **Access token expiry** | 15 minutes |
| **Refresh token expiry** | 7 days |
| **Frontend port** | 5173 (Vite) |
| **Backend port** | 4000 (Hapi) |
| **Allowed types** | PDF, DOCX, TXT |
| **Chunk size** | ~64 KB (Busboy) |

---

## Architecture at a Glance

```
User → React (5173) → Hapi (4000) → SQLite + Files
         ↓               ↓            ↓
      Material-UI    JWT Auth    /uploads/userId/
      React Query    Busboy      Prisma ORM
      Axios          Streaming
```

---

## Technology Stack - Quick Facts

### Frontend
- **React 18**: Component-based UI
- **TypeScript**: Type safety
- **Material-UI**: Pre-built components
- **React Query**: Server state management
- **Axios**: HTTP client with progress tracking
- **React Dropzone**: Drag-and-drop files

### Backend
- **Hapi.js**: Web framework with good security
- **Prisma**: Type-safe ORM
- **SQLite**: File-based database (dev)
- **JWT**: Stateless authentication
- **Bcrypt**: Password hashing
- **Busboy**: Stream-based file parser

---

## Key Concepts - One-Liners

| Concept | Explanation |
|---------|-------------|
| **JWT** | Signed token with user info, no server session needed |
| **Streaming** | Process file chunks, not entire file in memory |
| **HttpOnly Cookies** | JavaScript can't access, prevents XSS |
| **CORS** | Server allows specific origins to make requests |
| **Concurrent Limiting** | Queue system: max 3 uploads at once |
| **Busboy** | Parses multipart/form-data as stream |
| **Prisma** | ORM that generates type-safe database client |
| **React Query** | Manages API data, caching, and loading states |

---

## Must-Know Flows

### Login Flow (30 seconds)
1. User enters email/password
2. Backend finds user, checks bcrypt hash
3. Generate access (15m) + refresh (7d) tokens
4. Store in HttpOnly cookies
5. Frontend updates auth state
6. Redirect to /upload

### Upload Flow (45 seconds)
1. User drops file
2. Validate: type (PDF/DOCX/TXT), size (<10MB)
3. Add to queue as PENDING
4. Worker starts up to 3 uploads
5. Axios POST with FormData
6. Backend: JWT auth → Busboy parsing → Stream to disk
7. Progress events update UI
8. On complete: mark SUCCESS
9. Worker starts next file

### Token Refresh (20 seconds)
1. Access token expires
2. API returns 401
3. Axios interceptor catches it
4. Call /auth/refresh with refresh token
5. Get new access token
6. Retry original request

---

## Common Interview Questions - Quick Answers

### "Why two tokens?"
Access token expires quickly (15m) = limited damage if stolen. Refresh token lasts longer (7d) but more secure (HttpOnly). Balance between security and UX.

### "Why streaming?"
Memory efficient. Process 64KB chunks instead of entire file. Can handle files larger than RAM.

### "Why limit to 3 concurrent?"
Prevent overwhelming server/network. Better progress tracking. Fair resource usage.

### "How do you prevent XSS?"
HttpOnly cookies (JS can't access), React escapes by default, input validation, sanitize filenames.

### "How do you prevent CSRF?"
SameSite cookies, CORS whitelist, CSRF tokens (implemented), origin checking.

### "How would you scale?"
PostgreSQL instead of SQLite, S3 instead of local files, load balancer with multiple backend instances, Redis for caching, CDN for downloads.

---

## Security Checklist

✅ JWT authentication
✅ HttpOnly cookies (XSS protection)
✅ Password hashing (bcrypt)
✅ File type validation (server-side)
✅ File size limits
✅ CORS configuration
✅ Path traversal prevention (path.basename)
✅ User-isolated storage
✅ Input validation (Joi)
❌ Rate limiting (should add)
❌ Virus scanning (should add)
❌ Magic number validation (should add)

---

## Code Snippets - Must Know

### JWT Strategy
```typescript
server.auth.strategy("jwt", "jwt", {
  key: JWT_SECRET,
  validate: async (decoded) => {
    const userId = decoded?.id;
    return { isValid: Boolean(userId), credentials: { id: userId } };
  },
  cookieKey: "token"
});
```

### File Streaming
```typescript
busboy.on("file", (fieldname, fileStream, filename, encoding, mimetype) => {
  // Validate type
  if (!ALLOWED.includes(mimetype)) {
    fileStream.resume(); // Discard
    return;
  }
  
  // Stream to disk
  const writeStream = fs.createWriteStream(savePath);
  fileStream.pipe(writeStream);
});

req.pipe(busboy);
```

### Concurrent Queue
```typescript
const startWorker = () => {
  while (tasks.length && activeCount < CONCURRENCY) {
    activeCount++;
    const task = tasks.shift();
    uploadFile(task);
  }
};

onSuccess: () => {
  activeCount--;
  startWorker(); // Start next
};
```

---

## Improvements You Might Be Asked

### High Priority
1. **Cloud Storage (S3)**: Local doesn't scale
2. **PostgreSQL**: SQLite single-user
3. **Virus Scanning**: Security
4. **Rate Limiting**: Prevent abuse

### Medium Priority
5. **Redis Caching**: Performance
6. **Load Balancer**: High availability
7. **File Compression**: Save space/bandwidth
8. **Real-time Updates**: WebSockets
9. **Magic Numbers**: Better validation

### Nice to Have
10. **File Versioning**: Track changes
11. **Search/Filter**: Better UX
12. **Batch Operations**: Download multiple
13. **Analytics**: Usage insights
14. **Advanced ACL**: Sharing/permissions

---

## Database Schema

```
User (1) ─── (many) Documents

User:
- id (PK)
- email (unique, indexed)
- password (bcrypt hash)
- refreshTokenHash
- createdAt

Document:
- id (PK)
- userId (FK, indexed)
- filename
- path
- contentType
- size
- status
- createdAt (indexed)
- uploadedAt
```

---

## API Endpoints Quick List

### Auth
- `POST /api/auth/login` - Get tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-status` - Check token
- `POST /api/auth/logout` - Clear tokens

### Upload
- `POST /api/upload` - Upload file(s)

### Documents (not implemented, but might be asked)
- `GET /api/documents` - List user's files
- `GET /api/documents/:id` - Get file metadata
- `GET /api/download/:id` - Download file
- `DELETE /api/documents/:id` - Delete file

---

## Analogies to Remember

| Concept | Analogy |
|---------|---------|
| **HTTP Request/Response** | Sending/receiving letters |
| **Frontend/Backend/Database** | Restaurant: Dining area / Kitchen / Recipe book |
| **Access/Refresh Tokens** | Hotel room key / ID at front desk |
| **Streaming vs Buffering** | Drinking through straw / Pouring in mouth |
| **CORS** | Building security checking visitor badge |
| **Concurrent Limiting** | Checkout lanes at store |
| **JWT** | VIP concert pass with encoded info |
| **Busboy** | Assembly line processing packages |

---

## Red Flags to Avoid

❌ "I just followed a tutorial"
✅ "I designed this to solve X problem"

❌ "I don't know why I used that"
✅ "I chose X because Y, considered Z"

❌ "It just works"
✅ "It works because [explain mechanism]"

❌ "I would do everything differently"
✅ "For production, I'd improve A, B, C"

❌ *Defensive when asked about issues*
✅ "Good point! Here's how I'd fix that"

---

## Interview Day Tips

### Before Interview (30 min)
1. ✅ Run the app locally
2. ✅ Test login and upload
3. ✅ Review this cheat sheet
4. ✅ Have architecture diagram ready
5. ✅ Prepare 2-3 improvement ideas

### During Interview
1. 🎯 Start with high-level, then dive deep
2. 🎯 Draw diagrams if helpful
3. 🎯 Admit what you don't know
4. 🎯 Show enthusiasm to learn
5. 🎯 Ask clarifying questions
6. 🎯 Discuss trade-offs

### Questions to Ask Interviewer
- "What challenges does your team face with file uploads?"
- "What scale do your applications operate at?"
- "What's your tech stack?"
- "How do you handle large file uploads?"
- "What security measures are most important to you?"

---

## Emergency Deep Dives

### If Asked About Streaming in Detail
```
Traditional (Bad):
1. Receive all bytes
2. Store in memory (500MB file = 500MB RAM)
3. Process
4. Save to disk

Streaming (Good):
1. Receive chunk (64KB)
2. Process chunk
3. Write chunk to disk
4. Repeat
5. Memory usage: 64KB constant

Benefits:
- Constant memory usage
- Can handle files > available RAM
- Start processing immediately
- Better performance
```

### If Asked About JWT in Detail
```
Structure: header.payload.signature

Header:
{ "alg": "HS256", "typ": "JWT" }

Payload:
{ "sub": 1, "iat": 1234567890, "exp": 1234568790 }

Signature:
HMACSHA256(base64(header) + "." + base64(payload), secret)

Verification:
1. Split token by "."
2. Decode header and payload
3. Recompute signature with secret
4. Compare signatures
5. Check expiration

Benefits:
- Stateless (no server session)
- Contains user info (no DB lookup)
- Tamper-proof (signature verification)
- Scalable (works across servers)
```

### If Asked About Bcrypt in Detail
```
Hashing:
1. Generate random salt (automatic)
2. Combine password + salt
3. Run through bcrypt algorithm
4. Store: "$2a$10$[salt][hash]"

Verification:
1. Extract salt from stored hash
2. Hash provided password with same salt
3. Compare resulting hashes
4. Match = valid password

Why Bcrypt:
- Slow by design (prevents brute force)
- Salted (each password unique hash)
- Adaptive (can increase rounds)
- One-way (can't decrypt)

Cost factor = 10:
- 2^10 = 1,024 rounds
- Takes ~100ms to hash
- Too fast: Easy to crack
- Too slow: Bad UX
```

---

## Final Checklist

Interview Readiness:
- [ ] Can explain project in 30 seconds
- [ ] Can draw architecture diagram
- [ ] Can walk through authentication flow
- [ ] Can walk through upload flow
- [ ] Can explain why each technology was chosen
- [ ] Can discuss 3+ improvements
- [ ] Can explain security measures
- [ ] Can discuss scaling strategy
- [ ] Know all the numbers (10MB, 3 concurrent, etc.)
- [ ] Have code examples ready

Technical Understanding:
- [ ] Understand JWT completely
- [ ] Understand streaming vs buffering
- [ ] Understand React state management
- [ ] Understand async/await and promises
- [ ] Understand database relationships
- [ ] Understand HTTP status codes
- [ ] Understand CORS and CSRF
- [ ] Understand password hashing

Soft Skills:
- [ ] Practiced explaining with analogies
- [ ] Comfortable saying "I don't know"
- [ ] Ready to discuss trade-offs
- [ ] Prepared questions for interviewer
- [ ] Know how to handle criticism

---

## One Last Thing

**Remember**: Interviewers want to see:
1. **Understanding** over memorization
2. **Problem-solving** over perfect solutions
3. **Communication** over deep knowledge
4. **Learning attitude** over knowing everything
5. **Trade-off awareness** over absolute answers

You don't need to be perfect. You need to show you can:
- Think through problems
- Learn new things
- Explain your reasoning
- Work with others
- Improve over time

**You've got this! 🚀**

---

## Emergency Contacts (Links)

If you need to reference during interview:
- Main Guide: `INTERVIEW_GUIDE.md`
- Architecture: `ARCHITECTURE.md`
- Questions: `COMMON_INTERVIEW_QUESTIONS.md`
- Improvements: `IMPROVEMENTS_AND_ENHANCEMENTS.md`

**Good luck!** 🍀
