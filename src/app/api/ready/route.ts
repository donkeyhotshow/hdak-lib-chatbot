import { NextResponse } from "next/server";

export async function GET() {
  const hasLlmProvider = Boolean(
    process.env.GROQ_API_KEY?.trim() || process.env.QWEN_API_KEY?.trim()
  );
  const configuredProviders = [
    process.env.GROQ_API_KEY?.trim() ? "groq" : null,
    process.env.QWEN_API_KEY?.trim() ? "qwen" : null,
  ].filter((provider): provider is string => Boolean(provider));
  const hasDatabase = Boolean(
    process.env.DATABASE_URL?.trim() || process.env.NEON_POSTGRES_URL?.trim()
  );
  const missing = [
    ...(!hasLlmProvider ? ["GROQ_API_KEY or QWEN_API_KEY"] : []),
    ...(!hasDatabase ? ["DATABASE_URL or NEON_POSTGRES_URL"] : []),
  ];

  if (missing.length > 0) {
    return NextResponse.json(
      {
        status: "not_ready",
        missing,
        configuredProviders,
        message: "Missing critical environment variables",
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
