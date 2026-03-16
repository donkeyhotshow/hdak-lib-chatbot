import { getMissingCriticalEnvVars } from "@/lib/server/_core/env";

export const runtime = "nodejs";

export async function GET() {
  const missing = getMissingCriticalEnvVars();
  if (missing.length > 0) {
    return Response.json({ ready: false, missing }, { status: 503 });
  }
  return Response.json({ ready: true });
}
