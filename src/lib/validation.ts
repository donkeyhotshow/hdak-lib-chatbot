import { NextRequest } from 'next/server';
import { SESSION_HEADER } from '@/lib/session';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format.
 */
export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Extract and validate sessionId from request header.
 * Returns the session ID if valid, or 'anonymous' as fallback.
 */
export function getSessionIdFromRequest(request: NextRequest): string {
  const raw = request.headers.get(SESSION_HEADER)?.trim() ?? '';
  return UUID_REGEX.test(raw) ? raw : 'anonymous';
}

/**
 * Extract and validate sessionId from request header.
 * Returns null if invalid or missing.
 */
export function getSessionIdStrict(request: NextRequest): string | null {
  const raw = request.headers.get(SESSION_HEADER)?.trim();
  if (!raw || !UUID_REGEX.test(raw)) return null;
  return raw;
}
