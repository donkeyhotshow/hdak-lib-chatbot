import { COOKIE_NAME } from "@shared/const";
import { describe, expect, it } from "vitest";
import {
  appendExpiredSessionCookie,
  authenticateUserFromRequest,
  createTrpcFetchContext,
} from "./nextContext";

describe("nextContext adapters", () => {
  it("appends an expired session cookie", () => {
    const req = new Request("http://localhost:3000/api/auth/logout", {
      headers: {
        cookie: `${COOKIE_NAME}=token`,
      },
    });
    const headers = new Headers();

    appendExpiredSessionCookie(req, headers);

    const setCookie = headers.get("set-cookie");
    expect(setCookie).toContain(`${COOKIE_NAME}=`);
    expect(setCookie).toContain("Max-Age=0");
  });

  it("creates tRPC fetch context with anonymous user by default", async () => {
    const req = new Request("http://localhost:3000/api/trpc/system.getInfo");
    const resHeaders = new Headers();

    const ctx = await createTrpcFetchContext({ req, resHeaders });

    expect(ctx.user).toBeNull();
    expect(ctx.req).toBeTruthy();
    expect(ctx.res).toBeTruthy();
  });

  it("uses the first IP from x-forwarded-for header", async () => {
    const req = new Request("http://localhost:3000/api/trpc/system.getInfo", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    const resHeaders = new Headers();
    const ctx = await createTrpcFetchContext({ req, resHeaders });
    // The forwarded IP is extracted and stored in req.ip on the express-like adapter
    expect(ctx.req.ip).toBe("1.2.3.4");
  });

  it("detects https protocol from x-forwarded-proto header", async () => {
    const req = new Request("http://localhost:3000/", {
      headers: { "x-forwarded-proto": "https" },
    });
    const resHeaders = new Headers();
    const ctx = await createTrpcFetchContext({ req, resHeaders });
    expect(ctx.req.protocol).toBe("https");
  });

  it("detects http protocol when x-forwarded-proto is not set", async () => {
    const req = new Request("http://localhost:3000/");
    const resHeaders = new Headers();
    const ctx = await createTrpcFetchContext({ req, resHeaders });
    expect(ctx.req.protocol).toBe("http");
  });

  it("detects https protocol from URL when x-forwarded-proto is absent", async () => {
    const req = new Request("https://myapp.example.com/");
    const resHeaders = new Headers();
    const ctx = await createTrpcFetchContext({ req, resHeaders });
    expect(ctx.req.protocol).toBe("https");
  });

  it("returns null for unauthenticated requests", async () => {
    const req = new Request("http://localhost:3000/api/trpc/test");
    const user = await authenticateUserFromRequest(req);
    expect(user).toBeNull();
  });

  it("res.setHeader with array value joins multiple values", async () => {
    const req = new Request("http://localhost:3000/");
    const resHeaders = new Headers();
    const ctx = await createTrpcFetchContext({ req, resHeaders });
    ctx.res.setHeader("x-custom", ["a", "b"]);
    expect(resHeaders.get("x-custom")).toBeTruthy();
  });

  it("res.clearCookie appends an expired set-cookie header", async () => {
    const req = new Request("http://localhost:3000/");
    const resHeaders = new Headers();
    const ctx = await createTrpcFetchContext({ req, resHeaders });
    ctx.res.clearCookie(COOKIE_NAME, { sameSite: "lax", secure: false });
    const setCookie = resHeaders.get("set-cookie");
    expect(setCookie).toContain(`${COOKIE_NAME}=`);
    expect(setCookie).toContain("Max-Age=0");
  });

  it("res.getHeader returns a previously set header", async () => {
    const req = new Request("http://localhost:3000/");
    const resHeaders = new Headers();
    const ctx = await createTrpcFetchContext({ req, resHeaders });
    ctx.res.setHeader("x-test-header", "hello");
    expect(ctx.res.getHeader("x-test-header")).toBe("hello");
  });
});
