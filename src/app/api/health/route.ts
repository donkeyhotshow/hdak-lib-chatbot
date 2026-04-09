import { NextResponse } from "next/server";

export async function GET() {
  // M32: don't expose uptime (timing side-channel)
  return NextResponse.json({ status: "ok" });
}
