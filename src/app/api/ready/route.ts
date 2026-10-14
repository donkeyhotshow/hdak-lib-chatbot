import { NextResponse } from "next/server";

export async function GET() {
  const hasLlmProvider = Boolean(
    process.env.HDAKLLM?.trim() ||
      process.env.GROQ_API_KEY?.trim() ||
      process.env.QWEN_API_KEY?.trim()
  );
  const configuredProviders = [
    process.env.HDAKLLM?.trim() ? "llm7" : null,
    process.env.GROQ_API_KEY?.trim() ? "groq" : null,
    process.env.QWEN_API_KEY?.trim() ? "qwen" : null,
  ].filter((provider): provider is string => Boolean(provider));
  const hasDatabase = Boolean(
    process.env.DATABASE_URL?.trim() ||
      process.env.NEON_DATABASE_URL?.trim() ||
      process.env.NEON_POSTGRES_URL?.trim() ||
      process.env.NEON_POSTGRES_PRISMA_URL?.trim() ||
      process.env.NEON_POSTGRES_URL_NON_POOLING?.trim()
  );
  const missing = [
    ...(!hasLlmProvider ? ["HDAKLLM or GROQ_API_KEY or QWEN_API_KEY"] : []),
    ...(!hasDatabase ? ["DATABASE_URL or NEON_POSTGRES_URL"] : []),
  ];

  if (missing.length > 0) {
    const strictRuntime = process.env.NODE_ENV === "production";

    return NextResponse.json(
      {
        status: strictRuntime ? "not_ready" : "degraded",
        missing,
        configuredProviders,
        message: strictRuntime
          ? "Missing critical environment variables"
          : "Preview runtime is missing optional provider configuration",
      },
      { status: strictRuntime ? 503 : 200 }
    );
  }

  return NextResponse.json({
    status: "ready",
    configuredProviders,
    message: "All critical systems are configured",
  });
}
