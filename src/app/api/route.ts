// L21: removed debug "Hello, world!" endpoint — exposes API existence in production
export const dynamic = "force-static";
export function GET() {
  return new Response(null, { status: 404 });
}
