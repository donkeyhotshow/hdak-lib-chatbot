export async function GET() {
  return Response.json({
    ok: true,
    hasKey: !!(
      process.env.BUILT_IN_FORGE_API_KEY ||
      process.env.FORGE_API_KEY ||
      process.env.OPENAI_API_KEY
    ),
    timestamp: new Date().toISOString(),
  });
}
