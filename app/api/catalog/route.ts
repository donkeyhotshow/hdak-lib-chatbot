export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

import { NextRequest, NextResponse } from "next/server";
import { searchCatalogDirect } from "@/lib/server/services/catalogSearch";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await searchCatalogDirect({
    author: sp.get("author") ?? undefined,
    title: sp.get("title") ?? undefined,
    topic: sp.get("topic") ?? undefined,
  });
  return NextResponse.json(result);
}
