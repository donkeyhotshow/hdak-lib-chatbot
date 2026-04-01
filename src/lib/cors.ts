import { NextRequest } from 'next/server';

/**
 * Check if the request origin is forbidden (CORS enforcement).
 * Only enforced in production — dev/test environments allow all origins.
 */
export function isForbiddenOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  // In production, requests without Origin (curl, server-to-server) bypass CORS by design,
  // but we log them for awareness. Only enforce CORS for browser requests with Origin header.
  if (!origin) return false;
  if (process.env.NODE_ENV !== 'production') return false;
  try {
    const originHost = new URL(origin).hostname;
    const reqHost = new URL(request.url).hostname;
    const localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    // Allow same-origin and localhost-to-localhost only
    if (originHost === reqHost) return false;
    if (localHosts.includes(originHost) && localHosts.includes(reqHost)) return false;
    return true;
  } catch {
    // Malformed origin header — treat as forbidden
    return true;
  }
}
