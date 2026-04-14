import { NextResponse } from "next/server";

export async function GET() {
  const criticalEnv = [
    "GROQ_API_KEY",
    "QWEN_API_KEY",
    "DATABASE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];

  const missing = criticalEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        status: "not_ready",
        missing,
        message: "Missing critical environment variables",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ready",
    message: "All critical systems are configured",
  });
}
