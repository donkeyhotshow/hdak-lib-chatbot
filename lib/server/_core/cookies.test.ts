/**
 * Tests for server/_core/cookies.ts
 *
 * Verifies that getSessionCookieOptions returns correct SameSite / Secure
 * values for different request protocols and X-Forwarded-Proto headers.
 */

import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./cookies";

/** Build a minimal Express Request mock. */
function makeReq(
  protocol: string,
  forwardedProto?: string | string[]
): Request {
  return {
    protocol,
    headers: forwardedProto ? { "x-forwarded-proto": forwardedProto } : {},
  } as unknown as Request;
}

describe("getSessionCookieOptions", () => {
  // ── always-present fields ────────────────────────────────────────────────

  it("always sets httpOnly=true", () => {
    const opts = getSessionCookieOptions(makeReq("https"));
    expect(opts.httpOnly).toBe(true);
  });

  it("always sets path='/'", () => {
    const opts = getSessionCookieOptions(makeReq("https"));
    expect(opts.path).toBe("/");
  });

  // ── HTTPS requests ────────────────────────────────────────────────────────

  it("sets secure=true for HTTPS requests", () => {
    const opts = getSessionCookieOptions(makeReq("https"));
    expect(opts.secure).toBe(true);
  });

  it("sets sameSite='strict' for HTTPS requests", () => {
    const opts = getSessionCookieOptions(makeReq("https"));
    expect(opts.sameSite).toBe("strict");
  });

  // ── plain HTTP requests ────────────────────────────────────────────────────

  it("sets secure=false for plain HTTP", () => {
    const opts = getSessionCookieOptions(makeReq("http"));
    expect(opts.secure).toBe(false);
  });

  it("sets sameSite='lax' for plain HTTP (not 'none')", () => {
    const opts = getSessionCookieOptions(makeReq("http"));
    expect(opts.sameSite).toBe("lax");
    expect(opts.sameSite).not.toBe("none");
  });

  // ── X-Forwarded-Proto header ──────────────────────────────────────────────

  it("treats request as HTTPS when X-Forwarded-Proto is 'https'", () => {
    const opts = getSessionCookieOptions(makeReq("http", "https"));
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("strict");
  });

  it("treats request as HTTPS with comma-separated forwarded proto 'https, http'", () => {
    const opts = getSessionCookieOptions(makeReq("http", "https, http"));
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("strict");
  });

  it("treats request as HTTP when X-Forwarded-Proto is 'http' only", () => {
    const opts = getSessionCookieOptions(makeReq("http", "http"));
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe("lax");
  });

  it("treats request as HTTPS when X-Forwarded-Proto is an array containing 'https'", () => {
    const opts = getSessionCookieOptions(makeReq("http", ["https", "http"]));
    expect(opts.secure).toBe(true);
  });

  it("handles X-Forwarded-Proto with extra whitespace", () => {
    const opts = getSessionCookieOptions(makeReq("http", "  https  "));
    expect(opts.secure).toBe(true);
  });
});
