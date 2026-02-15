import { z } from 'zod';
import { insertMessageSchema, insertConversationSchema, conversations, messages } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations' as const,
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:id' as const,
      responses: {
        200: z.custom<typeof conversations.$inferSelect & { messages: typeof messages.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations' as const,
      input: z.object({ title: z.string().optional() }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/conversations/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },
  messages: {
    create: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages' as const,
      input: z.object({ content: z.string() }),
      responses: {
        200: z.void(), // SSE response, technically
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
