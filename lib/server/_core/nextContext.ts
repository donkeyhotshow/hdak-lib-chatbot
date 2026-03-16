import { COOKIE_NAME } from "@shared/const";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { getSessionCookieOptions } from "./cookies";
import { logger } from "./logger";
import { sdk } from "./sdk";
import type { TrpcContext } from "./context";

type ExpressLikeRequest = Pick<
  ExpressRequest,
  "headers" | "ip" | "protocol" | "hostname"
>;

type ExpressLikeResponse = Pick<
  ExpressResponse,
  "clearCookie" | "setHeader" | "getHeader"
>;

function getForwardedIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}

function getProtocol(req: Request): "http" | "https" {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto?.toLowerCase().includes("https")) {
    return "https";
  }
  return req.url.startsWith("https://") ? "https" : "http";
}

function toExpressLikeRequest(req: Request): ExpressLikeRequest {
  const hostHeader = req.headers.get("host") ?? "";
  const hostname = hostHeader.split(":")[0] ?? "";

  return {
    headers: Object.fromEntries(req.headers.entries()),
    ip: getForwardedIp(req),
    protocol: getProtocol(req),
    hostname,
  };
}

function createExpressLikeResponse(resHeaders: Headers): ExpressLikeResponse {
  const buildExpiredCookie = (
    name: string,
    options: ReturnType<typeof getSessionCookieOptions>
  ) =>
    `${name}=; Path=/; Max-Age=0; Expires=${new Date(0).toUTCString()}; HttpOnly; SameSite=${options.sameSite}${options.secure ? "; Secure" : ""}`;

  return {
    clearCookie(name, options) {
      const cookieValue = buildExpiredCookie(name, {
        httpOnly: true,
        path: "/",
        sameSite:
          (options?.sameSite as ReturnType<
            typeof getSessionCookieOptions
          >["sameSite"]) ?? "lax",
        secure: Boolean(options?.secure),
      });
      resHeaders.append("set-cookie", cookieValue);
      return this as ExpressResponse;
    },
    setHeader(name, value) {
      if (Array.isArray(value)) {
        resHeaders.delete(name);
        for (const item of value) {
          resHeaders.append(name, String(item));
        }
      } else {
        resHeaders.set(name, String(value));
      }
      return this as ExpressResponse;
    },
    getHeader(name) {
      return resHeaders.get(name) ?? undefined;
    },
  };
}

export async function authenticateUserFromRequest(req: Request) {
  const requestLike = toExpressLikeRequest(req);
  try {
    return await sdk.authenticateRequest(requestLike as ExpressRequest);
  } catch (error) {
    logger.debug?.("[auth] Unauthenticated request", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function appendExpiredSessionCookie(req: Request, resHeaders: Headers) {
  const requestLike = toExpressLikeRequest(req);
  const cookieOptions = getSessionCookieOptions(requestLike as ExpressRequest);
  const expired = `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=${new Date(0).toUTCString()}; HttpOnly; SameSite=${cookieOptions.sameSite}${cookieOptions.secure ? "; Secure" : ""}`;
  resHeaders.append("set-cookie", expired);
}

export async function createTrpcFetchContext(opts: {
  req: Request;
  resHeaders: Headers;
}): Promise<TrpcContext> {
  const req = toExpressLikeRequest(opts.req) as ExpressRequest;
  const res = createExpressLikeResponse(opts.resHeaders) as ExpressResponse;
  const user = await authenticateUserFromRequest(opts.req);

  return {
    req,
    res,
    user,
  };
}
