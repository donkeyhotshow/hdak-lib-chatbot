import { appendExpiredSessionCookie } from "@/lib/server/_core/nextContext";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const headers = new Headers();
  appendExpiredSessionCookie(req, headers);
  return Response.json({ success: true }, { headers });
}
