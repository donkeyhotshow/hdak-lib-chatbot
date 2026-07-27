import { NextResponse } from "next/server";

export async function GET() {
  const providerKeys = ["GROQ_API_KEY", "QWEN_API_KEY"] as const;
  const infraKeys = [
    "DATABASE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ] as const;

  const missingInfra = infraKeys.filter((key) => !process.env[key]);
  const hasProvider = providerKeys.some((key) => Boolean(process.env[key]));

  if (missingInfra.length > 0 || !hasProvider) {
    const missing = [...missingInfra];
    if (!hasProvider) {
      missing.push("GROQ_API_KEY|QWEN_API_KEY");
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

  return NextResponse.json({
    status: "ready",
    message: "All critical systems are configured",
  });
}
