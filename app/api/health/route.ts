import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanEnv(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return val.replace(/^["']|["']$/g, "").replace(/\\n/g, "").trim();
}

export async function GET() {
  const apiKey = cleanEnv(process.env.BUILT_IN_FORGE_API_KEY);
  const apiUrl = cleanEnv(process.env.BUILT_IN_FORGE_API_URL);
  const modelName = cleanEnv(process.env.AI_MODEL_NAME);
  const dbUrl = process.env.DATABASE_URL;

  // Env presence check (values hidden)
  const envCheck = {
    BUILT_IN_FORGE_API_KEY: apiKey
      ? `✅ present (${apiKey.length} chars, starts: ${apiKey.slice(0, 8)}...)`
      : "❌ MISSING",
    BUILT_IN_FORGE_API_URL: apiUrl || "❌ MISSING",
    AI_MODEL_NAME: modelName || "❌ MISSING",
    DATABASE_URL: dbUrl ? `✅ present (${dbUrl.slice(0, 30)}...)` : "❌ MISSING",
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? "✅ present"
      : "⚠️ not set (optional)",
    NODE_ENV: process.env.NODE_ENV || "unknown",
  };

  // Test OpenRouter with a minimal non-streaming request
  let openRouterTest: Record<string, unknown> = { status: "not tested" };
  if (apiKey) {
    try {
      const model = modelName || "google/gemini-2.0-flash-lite-preview-02-05";
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://hdak-lib-chatbot.onrender.com",
          "X-Title": "HDAK Library Intelligence",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
          stream: false,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      const body = await res.text();
      openRouterTest = {
        status: res.ok ? "✅ OK" : `❌ HTTP ${res.status}`,
        httpStatus: res.status,
        model,
        responsePreview: body.slice(0, 500),
      };
    } catch (e: unknown) {
      openRouterTest = {
        status: "❌ fetch threw exception",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  } else {
    openRouterTest = { status: "⏭ skipped — API key missing" };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: envCheck,
    openRouter: openRouterTest,
  });
}
