import { NextRequest, NextResponse } from "next/server";
import {
  getDspaceConfigStatus,
  getDspaceStatus,
  isDspaceAdminAuthorized,
  syncDspace,
} from "@/lib/dspace";
import { DspaceSyncSchema, validateInput } from "@/lib/validation";
import { isForbiddenOrigin } from "@/lib/cors";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function snapshot() {
  return {
    status: getDspaceStatus(),
    config: getDspaceConfigStatus(),
  };
}

export async function GET() {
  return NextResponse.json(snapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(`dspace-admin:${fingerprint}`))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Невірний формат запиту" }, { status: 400 });
  }

  const parsed = await validateInput(DspaceSyncSchema, body);
  if (!parsed.success || !parsed.data) {
    return NextResponse.json(
      { error: "Непідтримуваний режим синхронізації" },
      { status: 400 }
    );
  }

  const token = request.headers.get("x-dspace-admin-token");
  if (!isDspaceAdminAuthorized(token, parsed.data.mode)) {
    return NextResponse.json(
      {
        error: process.env.DSPACE_ADMIN_TOKEN
          ? "Потрібен дійсний токен адміністратора DSpace"
          : "Для live-синхронізації налаштуйте DSPACE_ADMIN_TOKEN",
      },
      { status: process.env.DSPACE_ADMIN_TOKEN ? 401 : 503 }
    );
  }

  try {
    return NextResponse.json(snapshotWithStatus(await syncDspace(parsed.data.mode)));
  } catch (error) {
    logger.error("Не вдалося запустити admin-синхронізацію DSpace", error);
    return NextResponse.json(
      { error: "Не вдалося запустити синхронізацію DSpace" },
      { status: 500 }
    );
  }
}

function snapshotWithStatus(status: ReturnType<typeof getDspaceStatus>) {
  return { status, config: getDspaceConfigStatus() };
}
