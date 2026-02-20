/**
 * Rate Limiter Middleware
 *
 * IP-based rate limiting for critical API endpoints to prevent abuse.
 * Chat/LLM endpoints use strict limits to control costs; OAuth uses
 * a tighter window to resist brute-force attacks.
 */

import rateLimit from "express-rate-limit";

/** Shared 429 JSON response format. */
const handler = (
  _req: import("express").Request,
  res: import("express").Response
) => {
  res.status(429).json({ error: "Too many requests, please try again later." });
};

/**
 * Rate limiter for the /api/chat streaming endpoint.
 * 30 requests per minute per IP to keep LLM costs bounded.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});

/**
 * Rate limiter for the /api/trpc routes (especially sendMessage).
 * 60 requests per minute per IP — tRPC handles many small mutations.
 */
export const trpcRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});

/**
 * Rate limiter for the OAuth callback endpoint.
 * 10 requests per minute per IP to mitigate brute-force / token-fishing.
 */
export const oauthRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});
