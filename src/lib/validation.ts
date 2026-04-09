import { NextRequest, NextResponse } from "next/server";
import { SESSION_HEADER } from "@/lib/session";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SESSION_COOKIE = "hdak_sid";

/**
 * Validate UUID format.
 */
export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Extract and validate sessionId from request.
 * Priority: cookie > header > server-generated UUID.
 * Cookie is preferred because it's HttpOnly and can't be spoofed by client JS.
 */
export function getSessionIdFromRequest(request: NextRequest): string {
  // 1. Try cookie first (most secure — HttpOnly, not accessible via JS)
  const cookie = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  if (cookie && UUID_REGEX.test(cookie)) return cookie;

  // 2. Fallback: header (for backward compatibility with existing clients)
  const raw = request.headers.get(SESSION_HEADER)?.trim() ?? "";
  if (UUID_REGEX.test(raw)) return raw;

  // 3. Generate server-side UUID
  return crypto.randomUUID();
}

/**
 * Build Set-Cookie header for session ID.
 * HttpOnly, Secure (in production), SameSite=Lax, 30-day expiry.
 */
export function buildSessionCookie(sessionId: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    "Path=/",
    "Max-Age=2592000", // 30 days
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Ensure session cookie is set on the response.
 * Call this on every API response that uses session ID.
 */
export function ensureSessionCookie(
  response: NextResponse,
  sessionId: string
): NextResponse {
  // Only set if not already present
  if (!response.cookies.get(SESSION_COOKIE)) {
    response.headers.append("Set-Cookie", buildSessionCookie(sessionId));
  }
  return response;
}

/**
 * Extract and validate sessionId from request header or cookie.
 * Returns null if invalid or missing.
 * Unlike getSessionIdFromRequest, never generates a fallback UUID.
 */
export function getSessionIdStrict(request: NextRequest): string | null {
  // Cookie takes priority (set by chat route, HttpOnly)
  const cookie = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  if (cookie && UUID_REGEX.test(cookie)) return cookie;

  // Fallback: header (for clients that send x-session-id explicitly)
  const raw = request.headers.get(SESSION_HEADER)?.trim();
  if (!raw || !UUID_REGEX.test(raw)) return null;
  return raw;
}
