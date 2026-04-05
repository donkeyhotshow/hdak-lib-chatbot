export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";
import {
  enforceSecurityRateLimit,
  getRequestIp,
} from "@/lib/server/security/rateLimiter";
import { searchCatalogDirect } from "@/lib/server/services/catalogSearch";

export async function GET(req: NextRequest) {
  const requestIp = getRequestIp({
    ip: "unknown",
    headers: Object.fromEntries(req.headers.entries()),
  });

  try {
    await enforceSecurityRateLimit({ endpoint: "/api/catalog", ip: requestIp });
  } catch {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const author = sp.get("author") ?? "";
  const title = sp.get("title") ?? "";
  const topic = sp.get("topic") ?? "";

  const result = await searchCatalogDirect({ author, title, topic });
  return NextResponse.json(result);
}
