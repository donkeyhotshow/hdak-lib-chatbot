import { NextRequest, NextResponse } from "next/server";
import { getDspaceStatus, syncDspace } from "@/lib/dspace";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getDspaceStatus());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { mode?: "mock" | "rest" | "oai-pmh" };
    const mode = body.mode ?? "mock";
    if (!["mock", "rest", "oai-pmh"].includes(mode)) {
      return NextResponse.json({ error: "Непідтримуваний режим синхронізації" }, { status: 400 });
    }
    return NextResponse.json(await syncDspace(mode));
  } catch {
    return NextResponse.json({ error: "Не вдалося запустити синхронізацію DSpace" }, { status: 500 });
  }
}
