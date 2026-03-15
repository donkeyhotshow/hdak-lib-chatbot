import { ENV } from "@/lib/server/_core/env";

export const runtime = "nodejs";

export async function GET() {
  const missing: string[] = [];
  if (!ENV.forgeApiKey) {
    missing.push("BUILT_IN_FORGE_API_KEY (or FORGE_API_KEY / OPENAI_API_KEY)");
  }
  if (missing.length > 0) {
    return Response.json({ ready: false, missing }, { status: 503 });
  }
  return Response.json({ ready: true });
}
