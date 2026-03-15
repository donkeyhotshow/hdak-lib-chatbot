import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "@/lib/server/db";
import { getSessionCookieOptions } from "@/lib/server/_core/cookies";
import { logger } from "@/lib/server/_core/logger";
import { sdk } from "@/lib/server/_core/sdk";
import type { Request as ExpressRequest } from "express";

export const runtime = "nodejs";

function toExpressLikeRequest(req: Request) {
  const hostHeader = req.headers.get("host") ?? "";
  return {
    headers: Object.fromEntries(req.headers.entries()),
    protocol: req.headers.get("x-forwarded-proto")?.includes("https")
      ? "https"
      : req.url.startsWith("https://")
        ? "https"
        : "http",
    hostname: hostHeader.split(":")[0] ?? "",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
  } as ExpressRequest;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return Response.json({ error: "code and state are required" }, { status: 400 });
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return Response.json({ error: "openId missing from user info" }, { status: 400 });
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const response = Response.redirect(new URL("/", req.url), 302);
    const cookieOptions = getSessionCookieOptions(toExpressLikeRequest(req));
    response.headers.append(
      "set-cookie",
      `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}; HttpOnly; SameSite=${cookieOptions.sameSite}${cookieOptions.secure ? "; Secure" : ""}`
    );

    return response;
  } catch (error) {
    logger.error("[OAuth] Callback failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "OAuth callback failed" }, { status: 500 });
  }
}
