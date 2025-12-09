# Improvements and Enhancements Guide

This document outlines potential improvements interviewers might ask about, organized by category with implementation details and trade-offs.

## Table of Contents
1. [Scalability Improvements](#scalability-improvements)
2. [Security Enhancements](#security-enhancements)
3. [Performance Optimizations](#performance-optimizations)
4. [Feature Additions](#feature-additions)
5. [DevOps & Deployment](#devops--deployment)
6. [User Experience](#user-experience)
7. [Monitoring & Observability](#monitoring--observability)
8. [Code Quality](#code-quality)

---

## Scalability Improvements

### 1. Migrate from SQLite to PostgreSQL

**Why:**
- SQLite doesn't support concurrent writes well
- No replication or clustering
- Limited to single server
- File locks cause bottlenecks

**Implementation:**

```prisma
// Before (SQLite)
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// After (PostgreSQL)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Migration Steps:**
```bash
# 1. Setup PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# 2. Update .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/fileupload"

# 3. Generate new client
npx prisma generate

# 4. Run migrations
npx prisma migrate dev

# 5. Migrate data (if needed)
# Export from SQLite
sqlite3 dev.db .dump > dump.sql

# Import to PostgreSQL (after converting syntax)
psql -d fileupload -f dump.sql
```

**Benefits:**
- Better concurrency
- ACID compliance
- Replication support
- Better performance at scale
- JSON columns support

**Trade-offs:**
- More complex setup
- Requires separate database server
- Higher resource usage
- Need for database management

**Cost:** Free (PostgreSQL) to $50+/month (Managed RDS)

---

### 2. Cloud Storage (AWS S3)

**Why:**
- Local storage doesn't scale horizontally
- Limited by server disk space
- No geographic distribution
- Single point of failure

**Implementation:**

**Backend:**
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Upload to S3
{
  method: "POST",
  path: "/api/upload",
  handler: async (request, h) => {
    const userId = request.auth.credentials.id;
    
    // ... parse file with Busboy
    
    // Upload to S3
    const key = `${userId}/${Date.now()}-${filename}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: mimetype,
      Metadata: {
        userId: userId.toString(),
        originalName: filename
      }
    }));
    
    // Save metadata to database
    await prisma.document.create({
      data: {
        userId,
        filename,
        path: key,  // S3 key instead of file path
        contentType: mimetype,
        size: fileSize,
        storageProvider: "s3"
      }
    });
    
    return { ok: true };
  }
}

// Generate download URL
{
  method: "GET",
  path: "/api/download/{documentId}",
  handler: async (request, h) => {
    const doc = await prisma.document.findUnique({
      where: { id: request.params.documentId }
    });
    
    // Generate signed URL (expires in 1 hour)
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: doc.path
    });
    
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 3600
    });
    
    return { url };
  }
}
```

**Direct Upload (Better Performance):**

```typescript
// Backend: Generate presigned upload URL
{
  method: "POST",
  path: "/api/upload/presigned",
  handler: async (request, h) => {
    const { filename, contentType } = request.payload;
    const userId = request.auth.credentials.id;
    const key = `${userId}/${Date.now()}-${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      ContentType: contentType
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600
    });
    
    return { uploadUrl, key };
  }
}

// Frontend: Upload directly to S3
const uploadToS3 = async (file: File) => {
  // 1. Get presigned URL
  const { uploadUrl, key } = await axios.post("/api/upload/presigned", {
    filename: file.name,
    contentType: file.type
  });
  
  // 2. Upload directly to S3
  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type
    },
    onUploadProgress: (progressEvent) => {
      // Track progress
    }
  });
  
  // 3. Notify backend upload complete
  await axios.post("/api/upload/complete", {
    key,
    filename: file.name,
    size: file.size
  });
};
```

**Benefits:**
- Unlimited storage
- 99.999999999% durability
- Global CDN (CloudFront)
- Automatic backups
- Versioning support
- Lifecycle policies

**Trade-offs:**
- AWS costs ($0.023/GB/month)
- Data transfer costs
- More complex setup
- Vendor lock-in (mitigated with abstraction layer)

**Cost Estimation:**
- Storage: 1TB = $23/month
- Requests: 1M GET = $0.40
- Data transfer: 1TB out = $90

---

### 3. Implement Caching (Redis)

**Why:**
- Reduce database load
- Faster API responses
- Session management
- Rate limiting storage

**Implementation:**

```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD
});

// Cache user data
const getUser = async (userId: number) => {
  // Try cache first
  const cached = await redis.get(`user:${userId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss: query database
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  // Store in cache (1 hour)
  await redis.setex(
    `user:${userId}`,
    3600,
    JSON.stringify(user)
  );
  
  return user;
};

// Cache document list
const getUserDocuments = async (userId: number) => {
  const cacheKey = `documents:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(documents));
  
  return documents;
};

// Invalidate cache on update
const uploadDocument = async (data) => {
  const document = await prisma.document.create({ data });
  
  // Invalidate user's document cache
  await redis.del(`documents:${data.userId}`);
  
  return document;
};

// Rate limiting
const checkRateLimit = async (userId: number) => {
  const key = `ratelimit:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    // First request in window, set expiry
    await redis.expire(key, 60); // 1 minute window
  }
  
  if (current > 10) {
    throw new Error("Rate limit exceeded");
  }
  
  return { remaining: 10 - current };
};
```

**Caching Strategies:**

```typescript
// 1. Cache-Aside (most common)
const getData = async (key) => {
  let data = await redis.get(key);
  if (!data) {
    data = await database.query();
    await redis.set(key, data);
  }
  return data;
};

// 2. Write-Through
const saveData = async (key, value) => {
  await database.save(value);
  await redis.set(key, value);
};

// 3. Write-Behind (async)
const saveData = async (key, value) => {
  await redis.set(key, value);
  queue.add({ key, value }); // Async DB update
};
```

**Benefits:**
- 10-100x faster than database
- Reduces database load
- Better scalability
- Session store
- Pub/Sub messaging

**Trade-offs:**
- Cache invalidation complexity
- Additional infrastructure
- Potential stale data
- Memory costs

**Cost:** $15-50/month (managed)

---

### 4. Load Balancing

**Why:**
- Distribute traffic across multiple servers
- High availability
- Zero-downtime deployments
- Better resource utilization

**Implementation:**

**NGINX Configuration:**

```nginx
# /etc/nginx/nginx.conf

upstream backend {
    # Load balancing method
    least_conn;  # or: round_robin, ip_hash
    
    server backend1:4000 max_fails=3 fail_timeout=30s;
    server backend2:4000 max_fails=3 fail_timeout=30s;
    server backend3:4000 max_fails=3 fail_timeout=30s;
    
    # Health check
    check interval=5000 rise=2 fall=3 timeout=1000;
}

server {
    listen 80;
    server_name api.example.com;
    
    # Upload size limit
    client_max_body_size 100M;
    
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts for uploads
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}
```

**AWS Application Load Balancer:**

```typescript
// Infrastructure as Code (Terraform)
resource "aws_lb" "main" {
  name               = "fileupload-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public.*.id
  
  enable_deletion_protection = true
}

resource "aws_lb_target_group" "backend" {
  name     = "backend-tg"
  port     = 4000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  
  health_check {
    enabled             = true
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
```

**Sticky Sessions (if needed):**

```nginx
upstream backend {
    ip_hash;  # Route same IP to same server
    # or use cookie-based
}
```

**Benefits:**
- High availability (no single point of failure)
- Horizontal scaling
- Zero-downtime deployments
- SSL termination at load balancer
- Geographic distribution

**Trade-offs:**
- Additional cost
- More complex architecture
- Session management challenges
- Network latency

---

### 5. Database Connection Pooling

**Why:**
- Opening connections is expensive
- Limited concurrent connections
- Better resource utilization
- Faster response times

**Implementation:**

```typescript
// Prisma (built-in pooling)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// PostgreSQL connection string with pooling
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=10&pool_timeout=20"

// Using external pooler (PgBouncer)
// Connection string points to PgBouncer
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db"

// PgBouncer config
[databases]
fileupload = host=postgres port=5432 dbname=fileupload

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

**Connection Pool Sizing:**

```typescript
// Formula: connections = (core_count * 2) + effective_spindle_count

// Example server: 4 cores, SSD (1 spindle)
// Optimal pool size = (4 * 2) + 1 = 9

// With 5 backend servers:
// Total connections = 5 * 9 = 45
// PostgreSQL max_connections should be > 45
```

**Monitoring:**

```typescript
// Check pool status
const poolStatus = await prisma.$queryRaw`
  SELECT 
    count(*) as total,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle
  FROM pg_stat_activity
  WHERE datname = current_database()
`;

console.log("Pool status:", poolStatus);
```

---

## Security Enhancements

### 1. Implement File Virus Scanning

**Why:**
- Prevent malware upload
- Protect other users
- Compliance requirements
- Reputation protection

**Implementation:**

**Option A: ClamAV (Open Source):**

```typescript
import { NodeClamClient } from "clamscan";

const clamav = new NodeClamClient({
  host: process.env.CLAMAV_HOST || "localhost",
  port: parseInt(process.env.CLAMAV_PORT || "3310")
});

// Scan after upload
const scanFile = async (filePath: string) => {
  const { isInfected, viruses } = await clamav.scanFile(filePath);
  
  if (isInfected) {
    // Quarantine file
    const quarantinePath = path.join(QUARANTINE_DIR, path.basename(filePath));
    await fs.promises.rename(filePath, quarantinePath);
    
    // Log incident
    await prisma.securityEvent.create({
      data: {
        type: "virus_detected",
        filePath,
        viruses: viruses.join(", "),
        timestamp: new Date()
      }
    });
    
    // Notify admin
    await sendAlert({
      to: ADMIN_EMAIL,
      subject: "Virus Detected",
      body: `Virus found: ${viruses.join(", ")} in file: ${filePath}`
    });
    
    throw new Error("Virus detected");
  }
  
  return { clean: true };
};

// In upload handler
{
  handler: async (request, h) => {
    // ... save file ...
    
    try {
      await scanFile(filePath);
      
      await prisma.document.create({
        data: { ...documentData, scanStatus: "clean" }
      });
    } catch (error) {
      await prisma.document.create({
        data: { ...documentData, scanStatus: "infected" }
      });
      
      return h.response({ error: "File failed security scan" }).code(400);
    }
    
    return { ok: true };
  }
}
```

**Option B: VirusTotal API (Cloud Service):**

```typescript
import axios from "axios";

const scanWithVirusTotal = async (filePath: string) => {
  const fileBuffer = await fs.promises.readFile(filePath);
  const formData = new FormData();
  formData.append("file", fileBuffer, path.basename(filePath));
  
  // Submit file
  const submitResponse = await axios.post(
    "https://www.virustotal.com/api/v3/files",
    formData,
    {
      headers: {
        "x-apikey": process.env.VIRUSTOTAL_API_KEY,
        ...formData.getHeaders()
      }
    }
  );
  
  const analysisId = submitResponse.data.data.id;
  
  // Wait for analysis (poll every 5 seconds)
  let result;
  while (true) {
    const analysisResponse = await axios.get(
      `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
      {
        headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY }
      }
    );
    
    if (analysisResponse.data.data.attributes.status === "completed") {
      result = analysisResponse.data.data.attributes.stats;
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Check results
  if (result.malicious > 0) {
    throw new Error(`Malicious file detected by ${result.malicious} engines`);
  }
  
  return { clean: true, scannedBy: result.harmless + result.undetected };
};
```

**Async Scanning (Better UX):**

```typescript
// 1. Upload file immediately
// 2. Mark as "scanning"
// 3. Scan in background
// 4. Update status when complete

import Bull from "bull";

const scanQueue = new Bull("file-scan");

// Producer: Add to queue
await prisma.document.create({
  data: { ...documentData, scanStatus: "pending" }
});

await scanQueue.add({ documentId: document.id });

// Consumer: Process scans
scanQueue.process(async (job) => {
  const { documentId } = job.data;
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  
  try {
    await scanFile(document.path);
    
    await prisma.document.update({
      where: { id: documentId },
      data: { scanStatus: "clean", scannedAt: new Date() }
    });
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: { scanStatus: "infected" }
    });
    
    // Quarantine and notify
  }
});
```

**Benefits:**
- Prevent malware spread
- Compliance (HIPAA, PCI-DSS)
- User trust
- Early threat detection

**Trade-offs:**
- Scanning takes time (async recommended)
- Resource intensive
- False positives possible
- API costs (VirusTotal: $0.01-0.10 per file)

---

### 2. Magic Number File Type Validation

**Why:**
- MIME types can be spoofed
- Extension doesn't guarantee file type
- Magic numbers are reliable
- Prevent malicious files

**Implementation:**

```typescript
import { fileTypeFromBuffer, fileTypeFromStream } from "file-type";

// Validate file type by magic numbers
const validateFileType = async (filePath: string) => {
  // Read first 4100 bytes (enough for most magic numbers)
  const buffer = Buffer.alloc(4100);
  const fd = await fs.promises.open(filePath, "r");
  await fd.read(buffer, 0, 4100, 0);
  await fd.close();
  
  const fileType = await fileTypeFromBuffer(buffer);
  
  if (!fileType) {
    throw new Error("Unknown file type");
  }
  
  const ALLOWED = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ];
  
  if (!ALLOWED.includes(fileType.mime)) {
    throw new Error(`File type ${fileType.mime} not allowed`);
  }
  
  return fileType;
};

// In upload handler
busboy.on("file", async (fieldname, fileStream, info) => {
  const { filename, encoding, mimeType } = info;
  
  // Save to temp location first
  const tempPath = path.join(TEMP_DIR, `${Date.now()}-${filename}`);
  const writeStream = fs.createWriteStream(tempPath);
  fileStream.pipe(writeStream);
  
  await new Promise((resolve) => writeStream.on("close", resolve));
  
  try {
    // Validate actual file type
    const actualType = await validateFileType(tempPath);
    
    // Compare with declared type
    if (actualType.mime !== mimeType) {
      console.warn(`Type mismatch: declared=${mimeType}, actual=${actualType.mime}`);
    }
    
    // Move to permanent location
    const finalPath = path.join(UPLOADS_DIR, filename);
    await fs.promises.rename(tempPath, finalPath);
    
  } catch (error) {
    // Delete temp file
    await fs.promises.unlink(tempPath);
    throw error;
  }
});
```

**Common Magic Numbers:**

```typescript
const MAGIC_NUMBERS = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),           // %PDF
  png: Buffer.from([0x89, 0x50, 0x4E, 0x47]),           // .PNG
  jpeg: Buffer.from([0xFF, 0xD8, 0xFF]),                // JPEG start
  zip: Buffer.from([0x50, 0x4B, 0x03, 0x04]),          // PK..
  docx: Buffer.from([0x50, 0x4B, 0x03, 0x04]),         // DOCX is ZIP
  exe: Buffer.from([0x4D, 0x5A])                        // MZ (Windows)
};

const checkMagicNumber = (buffer: Buffer, fileType: keyof typeof MAGIC_NUMBERS) => {
  const magic = MAGIC_NUMBERS[fileType];
  return buffer.slice(0, magic.length).equals(magic);
};
```

**Attack Prevention:**

```typescript
// Attacker renames virus.exe to document.pdf
// Without magic number check: Accepted (wrong!)
// With magic number check: Rejected (correct!)

const buffer = await readFirstBytes("document.pdf");
// Magic number: 0x4D 0x5A (EXE file)
// Expected: 0x25 0x50 0x44 0x46 (PDF file)
// Result: Rejected ✓
```

---

### 3. Rate Limiting

**Why:**
- Prevent abuse
- DoS protection
- Fair resource allocation
- Cost control

**Implementation:**

**Option A: In-Memory (Simple):**

```typescript
const rateLimits = new Map<number, { count: number; resetAt: Date }>();

const checkRateLimit = (userId: number, limit: number, windowMs: number) => {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || userLimit.resetAt.getTime() < now) {
    // New window
    rateLimits.set(userId, {
      count: 1,
      resetAt: new Date(now + windowMs)
    });
    return { allowed: true, remaining: limit - 1 };
  }
  
  if (userLimit.count >= limit) {
    const retryAfter = Math.ceil((userLimit.resetAt.getTime() - now) / 1000);
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
  }
  
  userLimit.count++;
  return { allowed: true, remaining: limit - userLimit.count };
};

// In route
{
  method: "POST",
  path: "/api/upload",
  handler: async (request, h) => {
    const userId = request.auth.credentials.id;
    
    try {
      const { remaining } = checkRateLimit(userId, 10, 60000); // 10 per minute
      h.header("X-RateLimit-Remaining", remaining.toString());
    } catch (error) {
      return h.response({ error: error.message }).code(429);
    }
    
    // ... upload logic ...
  }
}
```

**Option B: Redis (Distributed):**

```typescript
import Redis from "ioredis";

const redis = new Redis();

const checkRateLimit = async (
  userId: number,
  limit: number,
  windowSeconds: number
) => {
  const key = `ratelimit:${userId}`;
  
  // Increment counter
  const current = await redis.incr(key);
  
  if (current === 1) {
    // First request in window
    await redis.expire(key, windowSeconds);
  }
  
  if (current > limit) {
    const ttl = await redis.ttl(key);
    throw new Error(`Rate limit exceeded. Retry after ${ttl} seconds`);
  }
  
  return {
    allowed: true,
    remaining: limit - current,
    resetAt: Date.now() + (await redis.ttl(key)) * 1000
  };
};
```

**Option C: Token Bucket Algorithm:**

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  
  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
  
  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }
  
  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// Usage
const buckets = new Map<number, TokenBucket>();

const checkRateLimit = (userId: number) => {
  let bucket = buckets.get(userId);
  
  if (!bucket) {
    bucket = new TokenBucket(10, 0.5); // 10 tokens, refill 0.5/sec
    buckets.set(userId, bucket);
  }
  
  if (!bucket.consume(1)) {
    throw new Error("Rate limit exceeded");
  }
  
  return { remaining: bucket.getRemaining() };
};
```

**Different Limits for Different Actions:**

```typescript
const RATE_LIMITS = {
  login: { limit: 5, windowSeconds: 300 },      // 5 per 5 minutes
  upload: { limit: 10, windowSeconds: 60 },     // 10 per minute
  download: { limit: 100, windowSeconds: 60 },  // 100 per minute
  api: { limit: 1000, windowSeconds: 3600 }     // 1000 per hour
};

const checkRateLimit = async (userId: number, action: keyof typeof RATE_LIMITS) => {
  const config = RATE_LIMITS[action];
  return checkRateLimitImpl(userId, config.limit, config.windowSeconds);
};
```

**Benefits:**
- Prevent abuse
- Fair usage
- Cost control (API costs, storage)
- DoS protection

**Trade-offs:**
- Can frustrate legitimate users
- Requires careful tuning
- Storage overhead (Redis)
- Complex edge cases

---

## Performance Optimizations

### 1. Implement File Compression

**Why:**
- Reduce storage costs
- Faster uploads/downloads
- Better bandwidth utilization
- Lower data transfer costs

**Implementation:**

**Images:**
```typescript
import sharp from "sharp";

const compressImage = async (inputPath: string, outputPath: string) => {
  const metadata = await sharp(inputPath).metadata();
  
  if (metadata.width && metadata.width > 1920) {
    // Resize if too large
    await sharp(inputPath)
      .resize(1920, 1080, {
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  } else {
    // Just compress
    await sharp(inputPath)
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  }
  
  const originalSize = (await fs.promises.stat(inputPath)).size;
  const compressedSize = (await fs.promises.stat(outputPath)).size;
  const savings = ((originalSize - compressedSize) / originalSize) * 100;
  
  console.log(`Compressed: ${savings.toFixed(2)}% reduction`);
  
  return { originalSize, compressedSize, savings };
};
```

**Documents (PDF):**
```typescript
import { PDFDocument } from "pdf-lib";

const compressPDF = async (inputPath: string, outputPath: string) => {
  const pdfBytes = await fs.promises.readFile(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Remove metadata
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  
  // Save with compression
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false
  });
  
  await fs.promises.writeFile(outputPath, compressedBytes);
};
```

**Text Files:**
```typescript
import pako from "pako";

const compressText = (text: string): Buffer => {
  const compressed = pako.gzip(text);
  return Buffer.from(compressed);
};

const decompressText = (compressed: Buffer): string => {
  const decompressed = pako.ungzip(compressed);
  return Buffer.from(decompressed).toString("utf-8");
};

// Store compressed in database
const content = "Large text content...";
const compressed = compressText(content);

await prisma.document.create({
  data: {
    content: compressed,
    isCompressed: true,
    originalSize: Buffer.byteLength(content),
    compressedSize: compressed.length
  }
});
```

**Automatic Compression:**
```typescript
const processUpload = async (filePath: string, mimetype: string) => {
  let finalPath = filePath;
  let compressed = false;
  let originalSize = (await fs.promises.stat(filePath)).size;
  let finalSize = originalSize;
  
  if (mimetype.startsWith("image/")) {
    const compressedPath = `${filePath}.compressed.jpg`;
    await compressImage(filePath, compressedPath);
    
    const compressedSize = (await fs.promises.stat(compressedPath)).size;
    
    if (compressedSize < originalSize * 0.8) {
      // Use compressed if >20% savings
      await fs.promises.unlink(filePath);
      finalPath = compressedPath;
      compressed = true;
      finalSize = compressedSize;
    } else {
      await fs.promises.unlink(compressedPath);
    }
  }
  
  return { finalPath, compressed, originalSize, finalSize };
};
```

**Benefits:**
- 50-90% size reduction
- Lower storage costs
- Faster downloads
- Better user experience

**Trade-offs:**
- CPU overhead
- Lossy compression (images)
- Processing time
- Complexity

---

### 2. CDN Integration

**Why:**
- Faster global downloads
- Reduced backend load
- Better availability
- Lower bandwidth costs

**Implementation:**

**CloudFront with S3:**

```typescript
// Terraform/AWS CDK
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_id   = "S3-uploads"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.default.cloudfront_access_identity_path
    }
  }
  
  enabled = true
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-uploads"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

**Generate CDN URLs:**

```typescript
const getCDNUrl = (s3Key: string): string => {
  const cdnDomain = process.env.CDN_DOMAIN; // d111111abcdef8.cloudfront.net
  return `https://${cdnDomain}/${s3Key}`;
};

// In download endpoint
{
  method: "GET",
  path: "/api/download/{documentId}",
  handler: async (request, h) => {
    const doc = await prisma.document.findUnique({
      where: { id: request.params.documentId }
    });
    
    // Return CDN URL instead of direct S3
    const url = getCDNUrl(doc.path);
    
    return { url };
  }
}
```

**Signed URLs (Private Content):**

```typescript
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { readFileSync } from "fs";

const generateSignedCDNUrl = (s3Key: string) => {
  const cdnDomain = process.env.CDN_DOMAIN;
  const url = `https://${cdnDomain}/${s3Key}`;
  
  const privateKey = readFileSync("private-key.pem", "utf8");
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
  
  const signedUrl = getSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan: new Date(Date.now() + 3600000).toISOString() // 1 hour
  });
  
  return signedUrl;
};
```

**Benefits:**
- 10-50x faster downloads
- Global edge locations
- Reduced origin load
- Automatic compression
- DDoS protection

**Trade-offs:**
- Additional cost ($0.085/GB)
- Cache invalidation complexity
- Signed URLs needed for private content
- Setup complexity

---

## Continued in next message due to length...

This document provides comprehensive coverage of:
1. ✅ Scalability (PostgreSQL, S3, Caching, Load Balancing, Connection Pooling)
2. ✅ Security (Virus Scanning, Magic Numbers, Rate Limiting)
3. ✅ Performance (Compression, CDN)
4. More sections to follow...

Each improvement includes:
- Why it's needed
- Complete implementation code
- Benefits and trade-offs
- Cost considerations
- Real-world considerations
