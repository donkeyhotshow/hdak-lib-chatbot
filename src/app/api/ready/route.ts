import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkCatalogAvailability } from "@/lib/catalog-search";
import { isDatabaseConfigured } from "@/lib/database-config";
import { checkRateLimitStore } from "@/lib/rate-limit";

export async function GET() {
  const configuredProviders = [
    (
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key ||
      process.env.GEMINIAPI
    )?.trim()
      ? "gemini"
      : null,
    process.env.HDAKLLM?.trim() ? "llm7" : null,
    process.env.GROK_API_KEY?.trim() ? "xai" : null,
    process.env.GROQ_API_KEY?.trim() || process.env.GROQ_API?.trim()
      ? "groq"
      : null,
    process.env.QWEN_API_KEY?.trim() ? "qwen" : null,
  ].filter((provider): provider is string => Boolean(provider));
  const providerKeys = [
    "GEMINI_API_KEY",
    "gemini_api_key",
    "GEMINIAPI",
    "HDAKLLM",
    "GROK_API_KEY",
    "GROQ_API_KEY",
    "GROQ_API",
    "QWEN_API_KEY",
  ] as const;
  const hasDatabaseUrl = isDatabaseConfigured();

  const missingInfra = hasDatabaseUrl
    ? []
    : ["DATABASE_URL, HDAK_DATABASE_URL, or NEON_DATABASE_URL"];
  const hasProvider = providerKeys.some(key => Boolean(process.env[key]));

  if (missingInfra.length > 0 || !hasProvider) {
    const missing: string[] = [...missingInfra];
    if (!hasProvider) {
      missing.push("HDAKLLM|GROK_API_KEY|GROQ_API_KEY|QWEN_API_KEY");
    }
    return NextResponse.json(
      {
        status: "not_ready",
        missing,
        message:
          "Missing critical environment variables (at least one provider key is required)",
      },
      { status: 503 }
    );
  }

  let database = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "unreachable";
    return NextResponse.json(
      {
        status: "not_ready",
        database,
        message: "Database connectivity check failed",
      },
      { status: 503 }
    );
  }

  // Read-only checks validate relation resolution, required columns and SELECT access.
  try {
    await db.execute(sql`select id, session_id, title, created_at from conversations limit 0`);
    await db.execute(sql`select id, conversation_id, role, content, created_at from messages limit 0`);
    await db.execute(sql`select id, session_id, endpoint, p256dh, auth, remind_at, sent, created_at from push_subscriptions limit 0`);
  } catch {
    return NextResponse.json(
      { status: "not_ready", database, schema: "invalid", message: "Required database schema is unavailable" },
      { status: 503 }
    );
  }

  const sharedRateLimitReady = await checkRateLimitStore();
  const rateLimitStore = sharedRateLimitReady
    ? "ok"
    : process.env.NODE_ENV === "production"
      ? "unavailable"
      : "not_configured";
  if (process.env.NODE_ENV === "production" && !sharedRateLimitReady) {
    return NextResponse.json(
      {
        status: "not_ready",
        database,
        rateLimitStore,
        message: "Shared rate-limit storage is unavailable",
      },
      { status: 503 }
    );
  }

  const catalog = (await checkCatalogAvailability()) ? "ok" : "unreachable";

  return NextResponse.json({
    status: "ready",
    configuredProviders,
    database,
    schema: "ok",
    rateLimitStore,
    catalog,
    message: "All critical systems are configured",
  });
}
