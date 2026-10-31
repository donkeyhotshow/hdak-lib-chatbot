import { NextResponse } from "next/server";

export async function GET() {
  const configuredProviders = [
    process.env.HDAKLLM?.trim() ? "llm7" : null,
    process.env.GROK_API_KEY?.trim() ? "grok" : null,
    process.env.GROQ_API_KEY?.trim() || process.env.GROQ_API?.trim()
      ? "groq"
      : null,
    process.env.QWEN_API_KEY?.trim() ? "qwen" : null,
  ].filter((provider): provider is string => Boolean(provider));
  const providerKeys = [
    "HDAKLLM",
    "GROK_API_KEY",
    "GROQ_API_KEY",
    "GROQ_API",
    "QWEN_API_KEY",
  ] as const;
  const hasDatabaseUrl = Boolean(
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.NEON_POSTGRES_URL ||
    process.env.NEON_POSTGRES_PRISMA_URL ||
    process.env.NEON_POSTGRES_URL_NON_POOLING
  );

  const missingInfra = hasDatabaseUrl ? [] : ["DATABASE_URL"];
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

  return NextResponse.json({
    status: "ready",
    configuredProviders,
    message: "All critical systems are configured",
  });
}
