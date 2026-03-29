interface RateLimitInfo {
  count: number;
  lastReset: number;
}

const rateLimits = new Map<string, RateLimitInfo>();

export function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const info = rateLimits.get(ip);
  if (!info) {
    rateLimits.set(ip, { count: 1, lastReset: now });
    return true;
  }
  if (now - info.lastReset > windowMs) {
    rateLimits.set(ip, { count: 1, lastReset: now });
    return true;
  }
  if (info.count >= limit) {
    return false;
  }
  info.count += 1;
  return true;
}

export function generateFingerprint(req: Request): string {
  const ip = req.headers.get("x-forwarded-for") || 'unknown';
  const ua = req.headers.get("user-agent") || 'unknown';
  return `${ip}-${ua}`;
}
