import { ENV } from "@/lib/server/_core/env";
import { getDb } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET() {
  const db = await getDb();
  const database = {
    configured: Boolean(ENV.databaseUrl),
    status: ENV.databaseUrl ? (db ? "connected" : "unavailable") : "mock_mode",
  };

  return Response.json({
    status: database.status === "unavailable" ? "degraded" : "ok",
    timestamp: new Date().toISOString(),
    database,
  });
}
