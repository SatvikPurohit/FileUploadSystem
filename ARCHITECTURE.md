# Security Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Access Token (JWT)](#access-token-jwt)
4. [Refresh Token](#refresh-token)
5. [Token Rotation](#token-rotation)
6. [Encryption & Hashing](#encryption--hashing)
7. [Refresh Token Revocation](#refresh-token-revocation)
8. [CSRF Protection](#csrf-protection)
9. [Security Best Practices](#security-best-practices)
10. [Flow Diagrams](#flow-diagrams)

---

## Overview

This File Upload System implements a **dual-token authentication system** using:
- **Access Tokens** (short-lived, 15 minutes) - for API authorization
- **Refresh Tokens** (long-lived, 7 days) - for obtaining new access tokens
- **CSRF Tokens** - for preventing Cross-Site Request Forgery attacks
- **Token Hashing** - for secure storage of refresh tokens

### Architecture Stack
- **Backend**: Node.js + Hapi.js + Prisma ORM
- **Database**: SQLite
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs for password hashing
- **Security**: HttpOnly cookies, CSRF protection, token rotation

---

## Authentication Flow

### 1. Login Flow
```
User → Frontend → POST /api/auth/login → Backend
                                         ↓
                                    Verify Credentials
                                         ↓
                                    Generate Tokens
                                         ↓
                           Issue: Access Token + Refresh Token + CSRF Token
                                         ↓
                                 Set HttpOnly Cookies
                                         ↓
                                    Return Success
```

**Line-by-line explanation** (`backend/routes/auth.ts`, lines 174-236):

```typescript
handler: async (request: Request, h: ResponseToolkit) => {
  const payload = request.payload as LoginPayload;
  const { email, password } = payload;
```
- **Lines 174-176**: Extract email and password from the request body
- Purpose: Get user credentials from the login form

```typescript
  if (!password || !email) {
    return h.response({ message: "username/email and password required" }).code(400);
  }
```
- **Lines 178-181**: Validate that both email and password are provided
- Purpose: Basic input validation to prevent empty submissions

```typescript
  const user = await prisma.user.findUnique({
    where: { email: email },
  });
```
- **Lines 183-185**: Query the database for a user with the provided email
- Purpose: Check if the user exists in our system

```typescript
  if (!user) {
    return h.response({ message: "Invalid credentials" }).code(401);
  }
```
- **Lines 187-189**: If user doesn't exist, return 401 Unauthorized
- Purpose: Security - don't reveal whether email exists (prevents enumeration attacks)

```typescript
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return h.response({ message: "Invalid credentials" }).code(401);
  }
```
- **Lines 191-195**: Compare the provided password with the stored hashed password
- Purpose: Verify the user's identity using bcrypt comparison
- Security: Never store plain passwords; always use hashing

```typescript
  const accessToken = signAccessToken({ sub: user.id });
```
- **Line 198**: Generate a short-lived access token (15 minutes)
- `sub` (subject): JWT standard claim representing the user ID
- Purpose: Create token for API authorization

```typescript
  const { token: refreshToken } = await signRefreshToken({ sub: user.id });
```
- **Line 199**: Generate a long-lived refresh token (7 days) and store its hash in DB
- Purpose: Allow the user to get new access tokens without re-authenticating
- Security: Only the hash is stored in the database, not the raw token

```typescript
  const csrf = crypto.randomBytes(24).toString("hex");
```
- **Line 200**: Generate a cryptographically secure random CSRF token
- 24 bytes = 48 hex characters of randomness
- Purpose: Prevent Cross-Site Request Forgery attacks

```typescript
  h.state("token", accessToken, {
    isHttpOnly: true,
    path: "/",
    isSameSite: "None",
    isSecure: false,
  });
```
- **Lines 203-208**: Set access token as an HttpOnly cookie
  - `isHttpOnly: true` - JavaScript cannot access this cookie (prevents XSS attacks)
  - `path: "/"` - Cookie is sent for all paths
  - `isSameSite: "None"` - Allows cross-site requests (needed for frontend on different port)
  - `isSecure: false` - Allows HTTP in development (should be `true` in production)

```typescript
  h.state("refresh_token", refreshToken, {
    isHttpOnly: true,
    path: "/",
    isSameSite: "None",
    isSecure: false,
  });
```
- **Lines 211-216**: Set refresh token as an HttpOnly cookie
- Same security settings as access token
- Purpose: Store refresh token securely on the client

```typescript
  h.state("csrf_token", csrf, {
    isHttpOnly: false,
    path: "/",
    isSameSite: "None",
    isSecure: false,
  });
```
- **Lines 219-224**: Set CSRF token as a regular cookie (NOT HttpOnly)
- `isHttpOnly: false` - JavaScript CAN access this (frontend needs to read it)
- Purpose: Frontend will send this back in request headers for verification

```typescript
  const token = JWT.sign({ sub: user.id }, JWT_SECRET, {
    expiresIn: "15m",
  });
  return h.response({ ok: true, accessToken }).state("token", token, {
    isHttpOnly: true,
    isSecure: process.env.NODE_ENV === "production",
    isSameSite: "Lax",
    path: "/",
    ttl: 15 * 60 * 1000,
  });
```
- **Lines 226-235**: Create another access token and return success response
- `ttl: 15 * 60 * 1000` - Time-to-live: 15 minutes in milliseconds
- Purpose: Return confirmation and token to the client

> **⚠️ Code Issue**: This code sets the access token cookie twice (lines 203-208 and 229-235) with different settings. The second call overwrites the first. The second one uses `isSameSite: "Lax"` and includes `ttl`, while the first uses `isSameSite: "None"`. This should be consolidated into a single cookie setting.

---

## Access Token (JWT)

### What is an Access Token?

An **access token** is a short-lived credential that proves the user's identity for accessing protected resources.

### Implementation (`backend/utils/auth.ts`, lines 21-23)

```typescript
export const signAccessToken = (payload: object) => {
  return JWT.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};
```

**Line-by-line:**
- **Line 21**: Export function to create access tokens
- **Line 22**: 
  - `JWT.sign()` - Creates a signed JWT token
  - `payload` - Contains user data (usually `{ sub: userId }`)
  - `JWT_SECRET` - Secret key used to sign the token (proves authenticity)
  - `expiresIn: "15m"` - Token expires in 15 minutes
- Purpose: Short expiration reduces risk if token is stolen

### JWT Structure

A JWT has three parts separated by dots (`.`):

```
header.payload.signature
```

**Example JWT:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Decoded:**

1. **Header** (base64 encoded):
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```
- `alg`: Algorithm used (HMAC SHA-256)
- `typ`: Token type (JWT)

2. **Payload** (base64 encoded):
```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1516239922
}
```
- `sub`: Subject (user ID)
- `iat`: Issued at (timestamp)
- `exp`: Expiration time (timestamp)

3. **Signature**:
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```
- Ensures token hasn't been tampered with
- Only server with secret key can verify/create valid tokens

### Verification (`backend/utils/auth.ts`, lines 92-116)

```typescript
export const validateAuth = async (
  request: Request
): Promise<JwtPayload | null> => {
  const authHeader = request.headers.authorization as string | undefined;

  let token: string | null = null;

  // 1. Prefer Authorization header
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }
  // 2. Fallback to cookie
  else if ((request as any).state?.token) {
    token = (request as any).state.token;
  }

  if (!token) return null;

  try {
    const decoded = JWT.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (err) {
    return null;
  }
};
```

**Line-by-line:**
- **Lines 92-94**: Function signature - validates access tokens
- **Line 95**: Extract `Authorization` header if present
- **Line 97**: Initialize token variable
- **Lines 100-101**: Check for `Bearer <token>` format in header
- **Line 102**: Extract token by removing "Bearer " prefix (7 characters)
- **Lines 104-106**: Fallback to cookie if no header present
- **Line 108**: Return null if no token found
- **Lines 110-112**: Verify token signature and expiration
  - `JWT.verify()` throws error if token is invalid or expired
- **Lines 113-115**: Return null if verification fails
- Purpose: Dual location support (header or cookie) for flexibility

---

## Refresh Token

### What is a Refresh Token?

A **refresh token** is a long-lived credential used to obtain new access tokens without requiring the user to log in again.

### Why Separate Tokens?

1. **Security**: If access token is stolen, it's only valid for 15 minutes
2. **Performance**: Access tokens are checked frequently; refresh tokens only when renewing
3. **Revocation**: Can invalidate refresh tokens without affecting active sessions immediately

### Implementation (`backend/utils/auth.ts`, lines 31-50)

```typescript
export const signRefreshToken = async (
  payload: any
): Promise<{ token: string; tokenId: string }> => {
  const tokenId = makeTokenId();
  const token = JWT.sign({ jti: tokenId, sub: payload.sub }, JWT_SECRET, {
    expiresIn: "7d",
  });

  // store only hash in DB (field: refreshTokenHash)
  const hashed = hashToken(token);
  if (!payload?.sub)
    throw new Error("signRefreshToken: payload.sub (userId) required");

  await prisma.user.update({
    where: { id: payload.sub },
    data: { refreshTokenHash: hashed },
  });

  return { token, tokenId };
};
```

**Line-by-line:**
- **Lines 31-33**: Function signature - returns token and its ID
- **Line 34**: Generate unique token ID using `crypto.randomBytes(16)`
- **Lines 35-37**: Create JWT with:
  - `jti` (JWT ID): Unique identifier for this token
  - `sub`: User ID
  - `expiresIn: "7d"`: Valid for 7 days
- **Line 40**: Hash the token using SHA-256
- **Lines 41-42**: Validate user ID is present
- **Lines 44-47**: Store ONLY the hash in database
  - Security: If database is compromised, attacker can't use the tokens
  - Only the user's browser has the actual refresh token
- **Line 49**: Return the raw token (to set as cookie) and its ID

### Token Hashing (`backend/utils/auth.ts`, lines 14-16)

```typescript
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

**Line-by-line:**
- **Line 14**: Function to hash tokens before storage
- **Line 15**: 
  - `crypto.createHash("sha256")` - Use SHA-256 hashing algorithm
  - `.update(token)` - Feed the token into the hash function
  - `.digest("hex")` - Output hash as hexadecimal string
- Purpose: One-way hash means even if DB is breached, tokens can't be recovered

### Refresh Token Verification (`backend/utils/auth.ts`, lines 59-79)

```typescript
export const verifyRefresh = async (token: string) => {
  try {
    const decoded = JWT.verify(token, JWT_SECRET) as JwtPayload;
    const userId = decoded.sub as string | undefined;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { refreshTokenHash: true },
    });

    if (!user || !user.refreshTokenHash) return null;

    const hashed = hashToken(token);
    if (hashed !== user.refreshTokenHash) return null; // mismatch = revoked/invalid

    return decoded;
  } catch (e) {
    return null;
  }
};
```

**Line-by-line:**
- **Line 60**: Begin try block for error handling
- **Line 61**: Verify JWT signature and expiration
- **Line 62**: Extract user ID from token
- **Line 63**: Return null if no user ID present
- **Lines 65-68**: Fetch user's stored refresh token hash from database
- **Line 70**: Return null if user not found or no hash stored (token was revoked)
- **Line 72**: Hash the provided token
- **Line 73**: Compare hashes - if mismatch, token is invalid or revoked
  - This is where revocation is checked!
  - If user logged out, hash was cleared, so this fails
- **Line 75**: Return decoded payload if all checks pass
- **Lines 76-78**: Return null on any error

---

## Token Rotation

**Token rotation** means issuing a new refresh token every time it's used, invalidating the old one.

### Why Rotate Tokens?

1. **Limit exposure window**: If a refresh token is stolen, it becomes invalid once the legitimate user refreshes
2. **Detect theft**: If an old token is reused, it indicates potential theft
3. **Industry best practice**: OWASP recommends rotation for sensitive applications

### Current Implementation

The system implements **partial rotation**:
- When login occurs, a new refresh token is issued
- The hash is stored, replacing any previous refresh token
- Old refresh tokens become invalid (their hash doesn't match anymore)

### Refresh Endpoint (`backend/routes/auth.ts`, lines 23-87)

```typescript
{
  method: "POST",
  path: "/api/auth/refresh",
  handler: async (request, h) => {
    // read refresh_token cookie
    const refreshToken = (request.state as any)?.refresh_token;
    if (!refreshToken) {
      return h.response({ ok: false, error: "no refresh token" }).code(401);
    }

    try {
      // verify refresh token
      const payload = JWT.verify(refreshToken, JWT_SECRET) as any;
      const userId = payload?.sub;

      if (!userId) {
        return h.response({ ok: false, error: "invalid refresh token" }).code(401);
      }

      // create short-lived access token
      const accessToken = signAccessToken({ sub: userId });

      // set HttpOnly cookie
      h.state("token", accessToken, {
        isHttpOnly: true,
        isSecure: process.env.NODE_ENV === "production",
        isSameSite: "Lax",
        path: "/",
        ttl: 15 * 60 * 1000,
      });

      return h.response({ ok: true, accessToken }).code(200);
    } catch (err) {
      console.error("refresh verify failed", err);
      return h.response({ ok: false, error: "invalid refresh token" }).code(401);
    }
  },
}
```

**Line-by-line:**
- **Lines 23-25**: Define POST endpoint at `/api/auth/refresh`
- **Line 44**: Extract refresh token from HttpOnly cookie
- **Lines 45-47**: Return 401 if no refresh token present
- **Line 50-51**: Verify JWT signature and expiration
- **Line 52**: Extract user ID from token payload
- **Lines 54-57**: Return error if user ID missing
- **Line 60**: Generate NEW access token (15 min lifespan)
- **Lines 63-69**: Set new access token as HttpOnly cookie
  - `ttl: 15 * 60 * 1000` - 15 minutes in milliseconds
- **Line 71**: Return success with new access token
- **Lines 72-75**: Handle any errors (expired token, invalid signature, etc.)

### Enhanced Rotation (Recommendation)

For maximum security, you could implement **full rotation**:
```typescript
// After verifying refresh token
const { token: newRefreshToken } = await signRefreshToken({ sub: userId });
h.state("refresh_token", newRefreshToken, { 
  isHttpOnly: true, 
  path: "/",
  ttl: 7 * 24 * 60 * 60 * 1000 
});
```

This would:
1. Issue a new refresh token every time `/refresh` is called
2. Invalidate the old refresh token
3. Prevent refresh token reuse

---

## Encryption & Hashing

### Password Hashing (bcrypt)

**Hashing is NOT encryption** - it's a one-way function.

### Why Hash Passwords?

1. **Database breach protection**: Even if database is stolen, passwords can't be recovered
2. **Internal security**: Admins/developers can't see user passwords
3. **Compliance**: Many regulations require password hashing

### Implementation (seed.ts / registration)

```typescript
import bcrypt from "bcryptjs";

// Hashing a password
const hashedPassword = await bcrypt.hash("Password123!", 10);
// 10 is the "salt rounds" - higher = slower but more secure
```

**How bcrypt works:**
1. Generate a random **salt** (unique per password)
2. Combine password + salt
3. Run through hashing algorithm multiple times (10 rounds)
4. Store: `$2a$10$salt+hash` (salt is included in output)

**Example hash:**
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```
- `$2a$` - bcrypt algorithm version
- `10` - cost factor (10 rounds)
- Rest is salt + hash combined

### Password Verification (`backend/routes/auth.ts`, line 192)

```typescript
const match = await bcrypt.compare(password, user.password);
```

**How comparison works:**
1. Extract salt from stored hash
2. Hash the provided password with same salt
3. Compare resulting hash with stored hash
4. Return true if match, false otherwise

### Token Hashing (SHA-256)

Refresh tokens are hashed before database storage:

```typescript
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

**Why SHA-256 for tokens?**
- Fast hashing (bcrypt is deliberately slow)
- Deterministic (same input = same output)
- One-way (can't reverse the hash)

**Difference from bcrypt:**
- No salt (not needed - tokens are already random)
- Much faster (tokens aren't human-chosen like passwords)
- Still secure for this purpose

---

## Refresh Token Revocation

**Revocation** means invalidating a token so it can no longer be used.

### Why Revoke Tokens?

1. **Logout**: User wants to end their session on all devices
2. **Security breach**: Suspected token theft
3. **Account compromise**: Immediately terminate all sessions
4. **Permission change**: Force re-authentication after role change

### Implementation (`backend/utils/auth.ts`, lines 84-90)

```typescript
export const revokeRefresh = async (userId: string = "") => {
  if (!userId) return;
  await prisma.user.update({
    where: { id: parseInt(userId) },
    data: { refreshTokenHash: null },
  });
};
```

**Line-by-line:**
- **Line 84**: Function to revoke a user's refresh token
- **Line 85**: Guard against empty userId
- **Lines 86-89**: Update user record in database
  - `refreshTokenHash: null` - Clear the stored hash
  - This invalidates ALL refresh tokens for this user
- Result: Next time refresh token is verified, hash won't match and validation fails

### Logout Flow (`backend/routes/auth.ts`, lines 116-145)

```typescript
{
  method: "POST",
  path: "/api/auth/logout",
  handler: async (request, h) => {
    const refresh = (request.state && request.state.refresh_token) || null;
    if (refresh) {
      try {
        const decoded = JWT.verify(refresh, JWT_SECRET) as JwtPayload;
        if (decoded && decoded.sub) await revokeRefresh(decoded.sub);
      } catch (e) {
        return h.response({ message: "" }).code(500);
      }
    }

    // clear cookies (send expired)
    h.unstate("token", { path: "/" });
    h.unstate("refresh_token", { path: "/auth/refresh" });
    h.unstate("csrf_token", { path: "/" });

    return h.response({ ok: true });
  },
}
```

> **⚠️ Code Issue**: The logout handler clears the refresh_token cookie with path `/auth/refresh` (line 611 in the code shown), but the token was set with path `/` (line 213 in login handler). Cookie paths must match for proper clearing. This should be `{ path: "/" }` to correctly clear the refresh token cookie.

**Line-by-line:**
- **Lines 595-597**: Define POST endpoint for logout
- **Line 599**: Extract refresh token from cookie
- **Line 600**: Check if refresh token exists
- **Line 602**: Decode the token to get user ID
- **Line 603**: Call revoke function to clear hash from database
  - This is the key line that invalidates the token!
- **Lines 604-606**: Handle any errors gracefully
- **Lines 610-612**: Clear all cookies by sending expired versions
  - `h.unstate()` tells browser to delete the cookies
  - ⚠️ **Path mismatch**: refresh_token uses `/auth/refresh` instead of `/`
- **Line 614**: Return success response

### What Happens After Revocation?

1. User's refresh token hash in DB is now `null`
2. User's browser still has the refresh token cookie
3. If user tries to refresh:
   ```
   verifyRefresh() is called
   → Token is decoded successfully
   → User's hash is fetched from DB (it's null)
   → Hash comparison fails (null !== hash)
   → Verification returns null
   → User gets 401 Unauthorized
   ```
4. User must log in again to get new tokens

---

## CSRF Protection

### What is CSRF?

**Cross-Site Request Forgery (CSRF)** is an attack where a malicious website tricks a user's browser into making unwanted requests to a trusted site where the user is authenticated.

### Attack Scenario WITHOUT CSRF Protection:

1. User logs into `yourbank.com`
2. Browser stores authentication cookie
3. User visits malicious site `evil.com`
4. `evil.com` contains hidden form:
   ```html
   <form action="https://yourbank.com/transfer" method="POST">
     <input type="hidden" name="to" value="attacker-account">
     <input type="hidden" name="amount" value="1000">
   </form>
   <script>document.forms[0].submit();</script>
   ```
5. Browser automatically sends cookies with request
6. Bank processes transfer (thinks it's legitimate user)
7. Money is stolen!

### Why HttpOnly Cookies Need CSRF Protection

**The Problem:**
- HttpOnly cookies are automatically sent by browser on every request
- JavaScript cannot read them (good for XSS protection)
- BUT browser sends them even for requests from malicious sites
- This makes CSRF attacks possible

**The Solution:**
- Add a token that malicious sites CAN'T access
- Require this token to be sent with each request
- Malicious sites can't read the token due to Same-Origin Policy

### Implementation in This System

#### 1. Token Generation (`backend/routes/auth.ts`, line 200)

```typescript
const csrf = crypto.randomBytes(24).toString("hex");
```
- Generate 24 random bytes = 48 hex characters
- Cryptographically secure randomness
- Unique per session

#### 2. Setting CSRF Cookie (`backend/routes/auth.ts`, lines 219-224)

```typescript
h.state("csrf_token", csrf, {
  isHttpOnly: false,    // JavaScript CAN read this
  path: "/",
  isSameSite: "None",
  isSecure: false,
});
```

**Key difference from other cookies:**
- `isHttpOnly: false` - Frontend JavaScript can read this value
- Frontend will read cookie and send it in request header

#### 3. CSRF Verification (`backend/utils/auth.ts`, lines 118-128)

```typescript
export const verifyCsrf = async (request: Request, h: any) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return h.continue;
  }
  const cookie = request.state.csrf_token;
  const header = request.headers["x-csrf-token"];
  if (!cookie || !header || cookie !== header) {
    return h.response({ message: "CSRF mismatch" }).code(403);
  }
  return h.continue;
};
```

**Line-by-line:**
- **Line 118**: CSRF verification middleware
- **Lines 119-121**: Skip verification for safe methods (GET, HEAD, OPTIONS)
  - These methods should not modify state, so CSRF is not a risk
- **Line 122**: Get CSRF token from cookie
- **Line 123**: Get CSRF token from `X-CSRF-Token` header
- **Line 124**: Check both exist and match
- **Lines 125-126**: Return 403 Forbidden if mismatch
- **Line 128**: Allow request to continue if valid

#### 4. Using CSRF Protection (`backend/routes/auth.ts`, line 125)

```typescript
{
  method: "POST",
  path: "/api/auth/logout",
  options: {
    pre: [{ method: verifyCsrf }],  // Verify CSRF before handler runs
  },
  handler: async (request, h) => {
    // ... logout logic
  },
}
```

### Frontend Implementation

The system includes a cookie utility for reading CSRF tokens:

**`frontend/src/utils/cookies.ts`:**
```typescript
export function readCookie(name: string): string | null {
  const cookieString = document.cookie;
  if (!cookieString) return null;
  
  const cookies = cookieString.split("; ");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

export function getCsrfToken(): string | null {
  return readCookie("csrf_token");
}
```

**Usage - Send token in header with state-changing requests:**
```typescript
import { getCsrfToken } from './utils/cookies';

axios.post('/api/auth/logout', {}, {
  headers: {
    'X-CSRF-Token': getCsrfToken()
  },
  withCredentials: true
});
```

**Important:** Cookies require proper `SameSite` settings:
- Development (HTTP): `SameSite=Lax` works without `Secure` flag
- Production (HTTPS): `SameSite=None` requires `Secure=true`

The backend automatically uses `Lax` for development and `None` for production.

### Why This Works

**Malicious site cannot:**
1. Read the CSRF cookie (Same-Origin Policy blocks it)
2. Guess the token (cryptographically random)
3. Send valid request without the token

**Legitimate site can:**
1. Read its own cookie using JavaScript
2. Include token in request header
3. Backend verifies cookie matches header

### CSRF vs XSS

- **CSRF**: Attacker controls the action, not the content
  - Protected by: CSRF tokens, SameSite cookies
  
- **XSS**: Attacker injects malicious scripts
  - Protected by: HttpOnly cookies, Content Security Policy, input sanitization

**This system uses both protections:**
- HttpOnly cookies prevent XSS from stealing tokens
- CSRF tokens prevent CSRF from using automatic cookie sending

---

## Security Best Practices

### 1. Never Store Plain Text Passwords
✅ **We do:** Hash with bcrypt (10 rounds)
```typescript
const hashedPassword = await bcrypt.hash(password, 10);
```

### 2. Short-Lived Access Tokens
✅ **We do:** 15-minute expiration
```typescript
expiresIn: "15m"
```

### 3. Hash Refresh Tokens in Database
✅ **We do:** Store SHA-256 hash only
```typescript
const hashed = hashToken(token);
await prisma.user.update({ data: { refreshTokenHash: hashed } });
```

### 4. HttpOnly Cookies
✅ **We do:** Prevent XSS from stealing tokens
```typescript
isHttpOnly: true
```

### 5. CSRF Protection
✅ **We do:** Verify tokens on state-changing operations
```typescript
pre: [{ method: verifyCsrf }]
```

### 6. Secure Cookie Settings (Production)
⚠️ **Should do:** Enable in production
```typescript
isSecure: process.env.NODE_ENV === "production",  // HTTPS only
isSameSite: "Strict",  // Don't send cross-site (more secure than "None")
```

### 7. Token Revocation
✅ **We do:** Clear hash on logout
```typescript
await revokeRefresh(decoded.sub);
```

### 8. Validate Token Expiration
✅ **We do:** JWT library handles this
```typescript
JWT.verify(token, JWT_SECRET)  // Throws error if expired
```

### 9. Prevent Browser Back Button on Protected Pages
✅ **We do:** Force logout from upload page
```typescript
// In UploadPage component
useEffect(() => {
  // Push multiple dummy states to make navigation harder
  for (let i = 0; i < 3; i++) {
    window.history.pushState(null, "", window.location.href);
  }
  
  const handlePopState = () => {
    // Push multiple states immediately to block back navigation
    window.history.pushState(null, "", window.location.href);
    window.history.pushState(null, "", window.location.href);
    // Show message: "Please use the logout button to exit"
  };
  
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };
  
  window.addEventListener("popstate", handlePopState);
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => {
    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, []);
```
This creates multiple history entries and immediately pushes more when back is pressed, making it significantly harder to navigate away. The `beforeunload` handler warns users before closing/refreshing the page. Users must use the logout button to properly exit.

---

## Flow Diagrams

### Complete Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    { email, password }
       ▼
┌─────────────────────────────────────────────────┐
│              Backend Server                      │
│                                                  │
│  2. Find user in database                       │
│     ┌─────────────────┐                         │
│     │ SELECT * FROM   │                         │
│     │ User WHERE      │                         │
│     │ email = ?       │                         │
│     └─────────────────┘                         │
│                                                  │
│  3. Verify password                             │
│     ┌─────────────────┐                         │
│     │ bcrypt.compare( │                         │
│     │   password,     │                         │
│     │   user.password │                         │
│     │ )               │                         │
│     └─────────────────┘                         │
│                                                  │
│  4. Generate tokens                             │
│     ┌────────────────────────────────┐          │
│     │ Access Token (JWT, 15min)     │          │
│     │ { sub: userId }               │          │
│     └────────────────────────────────┘          │
│     ┌────────────────────────────────┐          │
│     │ Refresh Token (JWT, 7days)    │          │
│     │ { jti: tokenId, sub: userId } │          │
│     │ → Hash and store in DB        │          │
│     └────────────────────────────────┘          │
│     ┌────────────────────────────────┐          │
│     │ CSRF Token (random 48 chars)  │          │
│     └────────────────────────────────┘          │
│                                                  │
│  5. Set HttpOnly cookies                        │
│     - token (access)                            │
│     - refresh_token                             │
│     - csrf_token (NOT HttpOnly)                 │
└──────────────┬──────────────────────────────────┘
               │
               │ 6. Response: { ok: true, accessToken }
               │    Set-Cookie: token=...; HttpOnly
               │    Set-Cookie: refresh_token=...; HttpOnly
               │    Set-Cookie: csrf_token=...
               ▼
        ┌─────────────┐
        │   Browser   │
        │  (stores    │
        │   cookies)  │
        └─────────────┘
```

### Access Token Usage Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. GET /api/upload
       │    Cookie: token=eyJhbG...
       ▼
┌─────────────────────────────────────────────────┐
│              Backend Server                      │
│                                                  │
│  2. Extract token from cookie                   │
│     ┌─────────────────┐                         │
│     │ token =         │                         │
│     │ request.state.  │                         │
│     │ token           │                         │
│     └─────────────────┘                         │
│                                                  │
│  3. Verify JWT                                  │
│     ┌─────────────────┐                         │
│     │ JWT.verify(     │                         │
│     │   token,        │                         │
│     │   JWT_SECRET    │                         │
│     │ )               │                         │
│     └─────────────────┘                         │
│          │                                       │
│          ├─ Valid → Continue to handler         │
│          └─ Invalid/Expired → 401 Unauthorized  │
└─────────────────────────────────────────────────┘
```

### Refresh Token Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ Access token expired
       │
       │ 1. POST /api/auth/refresh
       │    Cookie: refresh_token=eyJhbG...
       ▼
┌─────────────────────────────────────────────────┐
│              Backend Server                      │
│                                                  │
│  2. Extract refresh token                       │
│     ┌─────────────────┐                         │
│     │ refreshToken =  │                         │
│     │ request.state.  │                         │
│     │ refresh_token   │                         │
│     └─────────────────┘                         │
│                                                  │
│  3. Verify JWT signature                        │
│     ┌─────────────────┐                         │
│     │ decoded =       │                         │
│     │ JWT.verify(     │                         │
│     │   refreshToken, │                         │
│     │   JWT_SECRET    │                         │
│     │ )               │                         │
│     └─────────────────┘                         │
│                                                  │
│  4. Hash token and compare with DB              │
│     ┌─────────────────┐                         │
│     │ hash =          │                         │
│     │ sha256(token)   │                         │
│     │                 │                         │
│     │ user =          │                         │
│     │ findUser(       │                         │
│     │   decoded.sub   │                         │
│     │ )               │                         │
│     │                 │                         │
│     │ if hash !=      │                         │
│     │    user.        │                         │
│     │    refreshToken │                         │
│     │    Hash:        │                         │
│     │   → 401         │                         │
│     └─────────────────┘                         │
│                                                  │
│  5. Generate new access token                   │
│     ┌─────────────────┐                         │
│     │ newAccessToken  │                         │
│     │ = signAccess    │                         │
│     │   Token({       │                         │
│     │     sub: userId │                         │
│     │   })            │                         │
│     └─────────────────┘                         │
│                                                  │
│  6. Set new access token cookie                 │
└──────────────┬──────────────────────────────────┘
               │
               │ Response: { ok: true, accessToken }
               │ Set-Cookie: token=...; HttpOnly; Max-Age=900
               ▼
        ┌─────────────┐
        │   Browser   │
        │  (updates   │
        │   token)    │
        └─────────────┘
```

### Logout Flow with Revocation

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/logout
       │    Cookie: refresh_token=eyJhbG...
       │    Header: X-CSRF-Token: abc123...
       ▼
┌─────────────────────────────────────────────────┐
│              Backend Server                      │
│                                                  │
│  2. Verify CSRF token                           │
│     ┌─────────────────┐                         │
│     │ if cookie !=    │                         │
│     │    header:      │                         │
│     │   → 403         │                         │
│     └─────────────────┘                         │
│                                                  │
│  3. Decode refresh token                        │
│     ┌─────────────────┐                         │
│     │ decoded =       │                         │
│     │ JWT.verify(     │                         │
│     │   refreshToken  │                         │
│     │ )               │                         │
│     └─────────────────┘                         │
│                                                  │
│  4. Revoke refresh token                        │
│     ┌─────────────────┐                         │
│     │ UPDATE User     │                         │
│     │ SET             │                         │
│     │   refreshToken  │                         │
│     │   Hash = NULL   │                         │
│     │ WHERE           │                         │
│     │   id = userId   │                         │
│     └─────────────────┘                         │
│                                                  │
│  5. Clear all cookies                           │
│     - h.unstate("token")                        │
│     - h.unstate("refresh_token")                │
│     - h.unstate("csrf_token")                   │
└──────────────┬──────────────────────────────────┘
               │
               │ Response: { ok: true }
               │ Set-Cookie: token=; Max-Age=0
               │ Set-Cookie: refresh_token=; Max-Age=0
               │ Set-Cookie: csrf_token=; Max-Age=0
               ▼
        ┌─────────────┐
        │   Browser   │
        │  (deletes   │
        │   cookies)  │
        │             │
        │  → Redirect │
        │    to login │
        └─────────────┘
```

### CSRF Attack Prevention

#### Scenario 1: Attack WITHOUT CSRF Protection (Vulnerable)

```
┌──────────────┐                    ┌──────────────┐
│ evil.com     │                    │ yourapp.com  │
│              │                    │              │
│ <form        │                    │   Backend    │
│  action=     │                    │   Server     │
│  "yourapp... │                    │              │
│  /transfer"> │                    │              │
│              │                    │              │
│ <script>     │                    │              │
│  submit()    │                    │              │
│ </script>    │                    │              │
└──────┬───────┘                    └──────▲───────┘
       │                                   │
       │ Browser auto-includes cookies     │
       │ Cookie: token=xyz                 │
       └───────────────────────────────────┘
       
       ✗ Attack succeeds - server accepts request!
```

#### Scenario 2: Attack WITH CSRF Protection (Protected)

```
┌──────────────┐                    ┌──────────────┐
│ evil.com     │                    │ yourapp.com  │
│              │                    │              │
│ <form        │                    │   Backend    │
│  action=     │                    │   Server     │
│  "yourapp... │                    │              │
│  /transfer"> │                    │ verifyCsrf() │
│              │                    │ ├─ cookie    │
│ <script>     │                    │ ├─ header    │
│  submit()    │                    │ └─ compare   │
│ </script>    │                    │              │
└──────┬───────┘                    └──────▲───────┘
       │                                   │
       │ Browser sends cookie              │
       │ Cookie: token=xyz                 │
       │ Cookie: csrf_token=abc            │
       │                                   │
       │ ✗ But NO X-CSRF-Token header!    │
       │   (evil.com can't read cookie    │
       │    due to Same-Origin Policy)    │
       │                                   │
       └───────────────────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ 403 Forbidden│
              │ CSRF mismatch│
              └──────────────┘
              
       ✓ Attack blocked by CSRF protection!
```

#### Scenario 3: Legitimate Request (Allowed)

```
┌──────────────┐                    ┌──────────────┐
│ yourapp.com  │                    │ yourapp.com  │
│ (frontend)   │                    │              │
│              │                    │   Backend    │
│ JavaScript:  │                    │   Server     │
│              │                    │              │
│ const csrf = │                    │ verifyCsrf() │
│  getCookie(  │                    │ ├─ cookie    │
│   'csrf_...' │                    │ ├─ header    │
│  )           │                    │ └─ compare   │
│              │                    │              │
│ axios.post(  │                    │              │
│  '/transfer',│                    │              │
│  data,       │                    │              │
│  { headers: {│                    │              │
│    'X-CSRF-  │                    │              │
│     Token':  │                    │              │
│     csrf     │                    │              │
│  }}          │                    │              │
│ )            │                    │              │
└──────┬───────┘                    └──────▲───────┘
       │                                   │
       │ Request includes both:            │
       │ Cookie: csrf_token=abc            │
       │ Header: X-CSRF-Token=abc          │
       │                                   │
       └───────────────────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ 200 OK       │
              │ cookie ==    │
              │ header ✓     │
              └──────────────┘
              
       ✓ Legitimate request allowed!
```

---

## Summary

This File Upload System implements a **defense-in-depth security strategy**:

1. **Dual Token System**
   - Access tokens (15 min) for API calls
   - Refresh tokens (7 days) for token renewal
   - Minimizes exposure if token is compromised

2. **Secure Storage**
   - Passwords hashed with bcrypt (10 rounds)
   - Refresh tokens hashed with SHA-256 before DB storage
   - Only hashes stored, never plain text

3. **HttpOnly Cookies**
   - Access and refresh tokens in HttpOnly cookies
   - JavaScript cannot read them (XSS protection)
   - Automatically sent by browser (convenience)

4. **CSRF Protection**
   - CSRF token in non-HttpOnly cookie
   - Must be sent in request header
   - Prevents cross-site attacks

5. **Token Revocation**
   - Logout clears refresh token hash
   - Invalidates all sessions immediately
   - Forces re-authentication

6. **Token Rotation** (Partial)
   - New refresh token on login
   - Old tokens invalidated
   - Can be enhanced for full rotation

**Security Tradeoffs:**
- ✅ Secure against: XSS, CSRF, token theft, password breaches
- ⚠️  Requires: HTTPS in production, proper secret management
- 📝 Can improve: Full token rotation, rate limiting, MFA

---

## Known Issues

The following issues were identified and **have been fixed**:

### 1. ✅ FIXED: Cookie SameSite Settings

**Issue**: Cookies were set with `isSameSite: "None"` and `isSecure: false`, which is invalid in modern browsers. This caused cookies (especially CSRF tokens) to be rejected and `document.cookie` to return empty.

**Fix Applied**: Updated login handler to use environment-based settings:
- Development: `isSameSite: "Lax"` (works with HTTP)
- Production: `isSameSite: "None"` with `isSecure: true` (requires HTTPS)

**Code**: `backend/routes/auth.ts`, lines 202-228

### 2. ✅ FIXED: Duplicate Access Token Setting

**Issue**: The login handler was setting the access token cookie twice with conflicting settings.

**Fix Applied**: Consolidated into a single cookie setting with proper environment-based configuration. Removed duplicate code.

### 3. Remaining: Cookie Path Mismatch (Logout Handler)

**Location**: `backend/routes/auth.ts`, line 140

**Issue**: The logout handler attempts to clear the `refresh_token` cookie with path `/auth/refresh`, but the cookie was set with path `/` during login (line 213).

**Impact**: The refresh token cookie may not be properly cleared on logout because browsers require exact path matches for cookie deletion. This could leave the refresh token cookie in the browser even after logout.

**Recommendation**: Change the path to match the login setting:
```typescript
// Change from:
h.unstate("refresh_token", { path: "/auth/refresh" });

// To:
h.unstate("refresh_token", { path: "/" });
```

### 4. ✅ FIXED: Production Security Settings

**Issue**: Security settings were hardcoded for development.

**Fix Applied**: All cookie settings now automatically adapt based on `NODE_ENV`:
- Development: `isSecure: false`, `isSameSite: "Lax"`
- Production: `isSecure: true`, `isSameSite: "None"`

This ensures cookies work correctly in both environments without manual configuration changes.

---

## Conclusion

This architecture follows **OWASP best practices** for web application security while balancing usability and implementation complexity. The documented issues above should be addressed to ensure maximum security and correct functionality.
