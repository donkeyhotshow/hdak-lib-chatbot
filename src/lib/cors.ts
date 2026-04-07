import { NextRequest } from "next/server";

/**
 * Check if the request origin is forbidden (CORS enforcement).
 * Only enforced in production — dev/test environments allow all origins.
 */
export function isForbiddenOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // In production, requests without Origin are forbidden
  // (prevents curl/Postman/server-to-server bypass)
  if (!origin) {
    if (process.env.NODE_ENV === "production") return true;
    return false; // dev/test — allow all
  }
  if (process.env.NODE_ENV !== "production") return false;

  try {
    const requestUrl = new URL(request.url);
    const reqHost = requestUrl.hostname;
    const localHosts = ["localhost", "127.0.0.1", "0.0.0.0"];

    // Check Origin first
    if (origin) {
      const originHost = new URL(origin).hostname;
      if (originHost === reqHost) return false;
      if (localHosts.includes(originHost) && localHosts.includes(reqHost))
        return false;
      return true;
    }

    // Fallback: check Referer
    if (referer) {
      const refererHost = new URL(referer).hostname;
      if (refererHost === reqHost) return false;
      if (localHosts.includes(refererHost) && localHosts.includes(reqHost))
        return false;
      return true;
    }

    return true;
  } catch {
    // Malformed origin/referer header — treat as forbidden
    return true;
  }
}
