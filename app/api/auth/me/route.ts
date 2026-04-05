import { authenticateUserFromRequest } from "@/lib/server/_core/nextContext";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authenticateUserFromRequest(req);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  return Response.json(user);
}
