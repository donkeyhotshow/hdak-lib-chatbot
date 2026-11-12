import { NextRequest, NextResponse } from "next/server";
import { getDspaceStatus, syncDspace } from "@/lib/dspace";
import { DspaceSyncSchema, validateInput } from "@/lib/validation";
import { isForbiddenOrigin } from "@/lib/cors";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getDspaceStatus());
}

export async function POST(request: NextRequest) {
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невірний формат запиту" },
      { status: 400 }
    );
  }

  const parsed = await validateInput(DspaceSyncSchema, body);
  if (!parsed.success || !parsed.data) {
    return NextResponse.json(
      { error: "Непідтримуваний режим синхронізації" },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await syncDspace(parsed.data.mode));
  } catch (error) {
    logger.error("Не вдалося запустити синхронізацію DSpace", error);
    return NextResponse.json(
      { error: "Не вдалося запустити синхронізацію DSpace" },
      { status: 500 }
    );
  }
}
