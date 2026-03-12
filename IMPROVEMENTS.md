# Code Improvements and Recommendations

## Architecture Improvements

### 1. Error Handling Strategy

**Current State**: Error handling is inconsistent across the codebase.

**Recommendations**:

- Create a centralized error handling middleware
- Define custom error classes for different scenarios
- Implement proper error recovery strategies

```typescript
// server/_core/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super("VALIDATION_ERROR", 400, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", 404, `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", 401, message);
  }
}
```

### 2. Database Connection Pool Management

**Current State**: Database connection is created once but not managed properly.

**Recommendations**:

```typescript
// server/_core/db.ts
import { createPool } from "mysql2/promise";

let pool: Pool | null = null;

export async function getDbPool(): Promise<Pool> {
  if (pool) return pool;

  pool = await createPool({
    host: ENV.databaseHost,
    user: ENV.databaseUser,
    password: ENV.databasePassword,
    database: ENV.databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

### 3. Caching Strategy

**Current State**: Simple in-memory cache for AI responses.

**Recommendations**:

- Implement Redis for distributed caching
- Add cache invalidation strategies
- Monitor cache hit rates

```typescript
// server/_core/cache.ts
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  retryStrategy: times => Math.min(times * 50, 2000),
});

export async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCached<T>(
  key: string,
  value: T,
  ttl = 3600
): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 4. Async Job Queue

**Current State**: Document processing is synchronous and could block requests.

**Recommendations**:

- Implement Bull or BullMQ for job queuing
- Process documents asynchronously
- Add progress tracking

```typescript
// server/services/jobQueue.ts
import Queue from "bull";

export const documentProcessingQueue = new Queue("document-processing", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

documentProcessingQueue.process(async job => {
  const { documentId, title, content, sourceType } = job.data;

  job.progress(10);

  try {
    const result = await processDocument(
      documentId,
      title,
      content,
      sourceType
    );
    job.progress(100);
    return result;
  } catch (error) {
    job.progress(0);
    throw error;
  }
});

// In API endpoint
app.post("/api/documents/upload", async (req, res) => {
  const { title, content } = req.body;

  const job = await documentProcessingQueue.add({
    documentId: nanoid(),
    title,
    content,
    sourceType: "other",
  });

  res.json({ jobId: job.id });
});
```

### 5. Monitoring and Observability

**Current State**: Basic logging only.

**Recommendations**:

- Implement structured logging
- Add performance monitoring
- Track metrics and errors

```typescript
// server/_core/monitoring.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// Performance monitoring
export function measurePerformance(name: string) {
  const start = Date.now();
  return () => {
    const duration = Date.now() - start;
    logger.info(
      { operation: name, duration },
      `${name} completed in ${duration}ms`
    );
  };
}
```

---

## Performance Improvements

### 1. Database Query Optimization

**Current State**: Some queries might not be optimized.

**Recommendations**:

```typescript
// Add indexes to frequently queried columns
// In drizzle/schema.ts
export const conversations = mysqlTable(
  "conversations",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("userId").notNull().index(), // Add index
    createdAt: timestamp("createdAt").defaultNow(),
    // ...
  },
  table => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  })
);
```

### 2. Pagination for Large Result Sets

**Current State**: No pagination for resource lists.

**Recommendations**:

```typescript
// server/routers.ts
resources: router({
  list: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const [resources, total] = await Promise.all([
        db.getAllResources(input.limit, offset),
        db.countResources(),
      ]);
      return {
        resources,
        total,
        page: input.page,
        limit: input.limit,
        pages: Math.ceil(total / input.limit),
      };
    }),
}),
```

### 3. Lazy Loading for Messages

**Current State**: All messages are loaded at once.

**Recommendations**:

```typescript
// Implement virtual scrolling on frontend
// Use react-window or react-virtual
import { FixedSizeList } from 'react-window';

export function MessageList({ messages }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageItem message={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 4. Compression and Bundling

**Current State**: No explicit compression configuration.

**Recommendations**:

```typescript
// server/_core/index.ts
import compression from "compression";

app.use(
  compression({
    level: 6, // Balance between compression ratio and CPU usage
    threshold: 1024, // Only compress responses > 1KB
  })
);
```

---

## Code Quality Improvements

### 1. Testing Strategy

**Current State**: Limited test coverage.

**Recommendations**:

```typescript
// server/routers.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createCaller } from "./routers";

describe("Conversations Router", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    caller = createCaller(mockContext);
  });

  describe("sendMessage", () => {
    it("should create a user message", async () => {
      const result = await caller.conversations.sendMessage({
        conversationId: 1,
        content: "Test message",
      });

      expect(result).toBeDefined();
      expect(result.content).toBe("Test message");
      expect(result.role).toBe("user");
    });

    it("should generate an AI response", async () => {
      const result = await caller.conversations.sendMessage({
        conversationId: 1,
        content: "What resources do you have?",
      });

      expect(result.role).toBe("assistant");
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
```

### 2. Type Safety

**Current State**: Some `any` types are used.

**Recommendations**:

- Replace all `any` types with proper types
- Use strict TypeScript settings
- Enable `noImplicitAny` in tsconfig.json

### 3. Code Documentation

**Current State**: Some functions lack documentation.

**Recommendations**:

````typescript
/**
 * Generate an AI response for a user message.
 *
 * @param prompt - The user's message
 * @param language - Language code (en, uk, ru)
 * @param conversationId - ID of the conversation
 * @param userId - ID of the user
 * @param history - Recent conversation history for context
 * @returns Promise containing the AI response and knowledge source
 * @throws {AiPipelineError} When the LLM call fails
 *
 * @example
 * ```typescript
 * const result = await generateConversationReply({
 *   prompt: 'What databases do you have?',
 *   language: 'uk',
 *   conversationId: 1,
 *   userId: 1,
 *   history: [],
 * });
 * console.log(result.text); // AI response
 * console.log(result.source); // 'rag' | 'catalog_search' | 'general'
 * ```
 */
export async function generateConversationReply(
  params: AiPipelineParams
): Promise<ConversationReplyResult> {
  // ...
}
````

---

## Deployment and DevOps

### 1. Docker Configuration

**Current State**: Dockerfile exists but might need optimization.

**Recommendations**:

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/index.js"]
```

### 2. Environment Configuration

**Current State**: .env.example exists.

**Recommendations**:

- Create separate .env files for different environments
- Use environment-specific configurations
- Document all environment variables

```
# .env.production
NODE_ENV=production
DATABASE_URL=mysql://prod_user:***@prod-db.example.com/hdak_prod
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
LOG_LEVEL=info
```

### 3. CI/CD Pipeline

**Current State**: No CI/CD configuration.

**Recommendations**:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run check
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying to production..."
```

---

## Priority Roadmap

1. **Week 1**: Fix TypeScript errors and add input validation
2. **Week 2**: Implement error handling and logging
3. **Week 3**: Add comprehensive tests
4. **Week 4**: Optimize database queries and add caching
5. **Week 5**: Implement job queue for async processing
6. **Week 6**: Set up monitoring and observability
7. **Week 7**: Prepare deployment and documentation
8. **Week 8**: Security audit and hardening

---

## References

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Performance](https://react.dev/reference/react/Profiler)
