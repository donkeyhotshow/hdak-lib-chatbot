import { NextRequest } from "next/server";

/**
 * Check if the request origin is forbidden (CORS enforcement).
 * Only enforced in production — dev/test environments allow all origins.
 */
export function isForbiddenOrigin(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  try {
    const method = request.method.toUpperCase();
    const isMutating = !["GET", "HEAD", "OPTIONS"].includes(method);
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (
      isMutating &&
      secFetchSite &&
      !["same-origin", "same-site", "none"].includes(secFetchSite)
    ) {
      return true;
    }

    const requestUrl = new URL(request.url);
    const reqHost = requestUrl.hostname;
    const localHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
    const source = request.headers.get("origin") ?? request.headers.get("referer");

    // For mutating methods in production, require either Origin or Referer.
    // If both are missing, treat request as potentially forged (CSRF) and block it.
    // This returns true (forbidden) for POST/PATCH/DELETE and false for GET/HEAD/OPTIONS.
    if (!source) return isMutating;

    const sourceHost = new URL(source).hostname;
    if (sourceHost === reqHost) return false;
    if (localHosts.includes(sourceHost) && localHosts.includes(reqHost))
      return false;
    return true;
  } catch {
    // Malformed origin header — treat as forbidden
    return true;
  }
}
