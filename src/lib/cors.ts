import { NextRequest } from "next/server";

/**
 * Check if the request origin is forbidden (CORS enforcement).
 * Only enforced in production — dev/test environments allow all origins.
 */
export function isForbiddenOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

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

    // origin is guaranteed non-null here (checked above)
    const originHost = new URL(origin).hostname;
    if (originHost === reqHost) return false;
    if (localHosts.includes(originHost) && localHosts.includes(reqHost))
      return false;
    return true;
  } catch {
    // Malformed origin header — treat as forbidden
    return true;
  }
}
