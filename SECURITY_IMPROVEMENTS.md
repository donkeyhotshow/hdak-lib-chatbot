# Security Improvements for hdak-lib-chatbot

## 1. Content Security Policy (CSP) - HIGH PRIORITY

### Current Issue

The CSP in `server/_core/index.ts` allows `'unsafe-inline'` for both scripts and styles:

```typescript
scriptSrc: ["'self'", "'unsafe-inline'"],
styleSrc: ["'self'", "'unsafe-inline'"],
```

This is a security risk as it allows inline scripts and styles, which can be exploited for XSS attacks.

### Recommended Fix

```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
  },
},
```

### Implementation Notes

- Tailwind CSS v4 supports CSS-in-JS without inline styles
- Ensure no inline event handlers in React components
- Use external stylesheets where possible

---

## 2. Input Validation and Sanitization - HIGH PRIORITY

### Current Issue

The `/api/chat` endpoint doesn't validate the incoming messages format.

### Recommended Fix

Add Zod validation:

```typescript
// In server/_core/chat.ts
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(10000),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  language: z.enum(["en", "uk", "ru"]).optional(),
  conversationId: z.number().optional(),
});

app.post("/api/chat", async (req, res) => {
  try {
    const parsed = chatRequestSchema.parse(req.body);
    // ... rest of handler
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid request format", details: error.errors });
    }
    // ...
  }
});
```

---

## 3. Rate Limiting - MEDIUM PRIORITY

### Current Issue

Rate limiters are configured but thresholds are not documented or tested.

### Recommended Fix

Create a configuration file:

```typescript
// server/_core/rateLimiterConfig.ts
export const rateLimiterConfig = {
  chat: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: "Too many chat requests, please try again later",
  },
  trpc: {
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: "Too many requests, please try again later",
  },
  oauth: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many login attempts, please try again later",
  },
};
```

### Testing

- Load test with concurrent requests
- Verify rate limiter resets correctly
- Test edge cases (exactly at limit, just over limit)

---

## 4. SQL Injection Prevention - MEDIUM PRIORITY

### Current Issue

Drizzle ORM is being used, which provides parameterized queries by default. However, ensure all user inputs are properly typed.

### Recommended Fix

- Always use Drizzle's query builder methods
- Never concatenate user input into SQL strings
- Validate and sanitize all search queries

Example:

```typescript
// GOOD - using Drizzle's type-safe query builder
const results = await db.query.libraryResources.findMany({
  where: like(libraryResources.nameEn, `%${query}%`),
});

// BAD - never do this
const results = await db.query.libraryResources.findMany({
  where: sql`name LIKE '%${query}%'`, // VULNERABLE!
});
```

---

## 5. Authentication and Authorization - HIGH PRIORITY

### Current Issue

The OAuth implementation stores JWT in HTTP-only cookies, which is good. However, ensure CSRF protection is in place.

### Recommended Fix

Add CSRF token validation:

```typescript
// Add to server initialization
import cookieParser from "cookie-parser";
import csrf from "csurf";

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// For API endpoints, verify CSRF token
app.post("/api/trpc", csrfProtection, (req, res) => {
  // ... handler
});
```

---

## 6. Environment Variable Validation - MEDIUM PRIORITY

### Current Issue

Some environment variables are optional in development but required in production. This could lead to runtime errors.

### Recommended Fix

Use Zod for validation:

```typescript
// server/_core/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default("3000"),
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  BUILT_IN_FORGE_API_URL: z.string().url(),
  BUILT_IN_FORGE_API_KEY: z.string().min(1),
  OWNER_OPEN_ID: z.string().min(1),
  VITE_APP_ID: z.string().min(1),
  OAUTH_SERVER_URL: z.string().url(),
  VITE_OAUTH_PORTAL_URL: z.string().url(),
});

export const ENV = envSchema.parse(process.env);
```

---

## 7. XSS Prevention - HIGH PRIORITY

### Current Issue

The `sanitizeUntrustedContent` function in `server/services/aiPipeline.ts` removes HTML tags, which is good. However, ensure it's applied consistently.

### Recommended Fix

- Apply sanitization to all user-generated content
- Use DOMPurify on the frontend for additional protection
- Escape all user input in templates

```typescript
// Frontend - add DOMPurify
import DOMPurify from "dompurify";

const sanitized = DOMPurify.sanitize(userContent);
```

---

## 8. Dependency Vulnerabilities - MEDIUM PRIORITY

### Current Issue

Dependencies should be regularly updated and audited.

### Recommended Fix

```bash
# Audit dependencies
npm audit

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

Add to CI/CD pipeline:

```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=moderate
```

---

## 9. Logging and Monitoring - MEDIUM PRIORITY

### Current Issue

Sensitive information might be logged (e.g., API keys, user data).

### Recommended Fix

```typescript
// server/_core/logger.ts
export function sanitizeForLogging(obj: any): any {
  const sensitiveKeys = ["password", "token", "apiKey", "secret", "email"];

  if (typeof obj !== "object" || obj === null) return obj;

  const sanitized = { ...obj };
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = "[REDACTED]";
    }
  }
  return sanitized;
}

// Usage
logger.info("User action", sanitizeForLogging(userData));
```

---

## 10. HTTPS and Secure Transport - HIGH PRIORITY

### Deployment Requirement

- Always use HTTPS in production
- Set secure cookie flags:

```typescript
// server/_core/cookies.ts
export function getSessionCookieOptions(req: Request) {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: "strict" as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: isProduction ? ".yourdomain.com" : undefined,
  };
}
```

---

## Implementation Checklist

- [ ] Update CSP headers to remove `'unsafe-inline'`
- [ ] Add Zod validation to all API endpoints
- [ ] Implement CSRF protection
- [ ] Validate all environment variables with Zod
- [ ] Add DOMPurify to frontend
- [ ] Set up security audit in CI/CD
- [ ] Review and sanitize all logging
- [ ] Configure secure cookie flags
- [ ] Add HTTPS redirect in production
- [ ] Document security practices in README

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Zod Validation](https://zod.dev/)
